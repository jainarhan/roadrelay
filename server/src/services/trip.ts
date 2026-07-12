import { prisma } from '../prisma';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CreateTripInput, CompleteTripInput } from 'shared';
import { TripStatus, VehicleStatus, DriverStatus } from '@prisma/client';

export async function createTripService(input: CreateTripInput) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
  });
  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  const driver = await prisma.driver.findUnique({
    where: { id: input.driverId },
  });
  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  if (input.cargoWeight > vehicle.maxLoadCapacity) {
    throw new BadRequestError(`Cargo weight (${input.cargoWeight} kg) exceeds vehicle maximum capacity (${vehicle.maxLoadCapacity} kg)`);
  }

  return prisma.trip.create({
    data: {
      source: input.source,
      destination: input.destination,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      cargoWeight: input.cargoWeight,
      plannedDistance: input.plannedDistance,
      revenue: input.revenue ?? null,
      status: TripStatus.DRAFT,
    },
    include: {
      vehicle: true,
      driver: true,
    },
  });
}

export async function getTripsService() {
  return prisma.trip.findMany({
    include: {
      vehicle: true,
      driver: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function dispatchTripService(tripId: string) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.status !== TripStatus.DRAFT) {
      throw new BadRequestError('Only trips in DRAFT status can be dispatched');
    }

    // 1. Vehicle status AVAILABLE
    if (trip.vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestError(`Vehicle ${trip.vehicle.regNumber} is not AVAILABLE (current: ${trip.vehicle.status})`);
    }

    // 2. Driver status check: SUSPENDED
    if (trip.driver.status === DriverStatus.SUSPENDED) {
      throw new BadRequestError(`Driver ${trip.driver.name} is SUSPENDED and cannot be dispatched`);
    }

    // 3. Driver status AVAILABLE
    if (trip.driver.status !== DriverStatus.AVAILABLE) {
      throw new BadRequestError(`Driver ${trip.driver.name} is not AVAILABLE (current: ${trip.driver.status})`);
    }

    // 4. License expiry check
    const now = new Date();
    if (trip.driver.licenseExpiry <= now) {
      throw new BadRequestError(`Driver ${trip.driver.name} has an expired license`);
    }

    // 5. Safety score limit
    if (trip.driver.safetyScore < 50) {
      throw new BadRequestError(`Driver ${trip.driver.name} has a safety score below 50 (${trip.driver.safetyScore}), dispatch blocked`);
    }

    // Use conditional updateMany pattern to fully close double-booking race condition
    const tripUpdate = await tx.trip.updateMany({
      where: { id: tripId, status: TripStatus.DRAFT },
      data: {
        status: TripStatus.DISPATCHED,
        dispatchedAt: new Date(),
      },
    });
    if (tripUpdate.count === 0) {
      throw new BadRequestError('Trip is no longer in DRAFT status or has already been dispatched');
    }

    const vehicleUpdate = await tx.vehicle.updateMany({
      where: { id: trip.vehicleId, status: VehicleStatus.AVAILABLE },
      data: { status: VehicleStatus.ON_TRIP },
    });
    if (vehicleUpdate.count === 0) {
      throw new BadRequestError('Vehicle is no longer available — likely booked by another request');
    }

    const driverUpdate = await tx.driver.updateMany({
      where: { id: trip.driverId, status: DriverStatus.AVAILABLE },
      data: { status: DriverStatus.ON_TRIP },
    });
    if (driverUpdate.count === 0) {
      throw new BadRequestError('Driver is no longer available — likely booked by another request');
    }

    // Fetch the updated trip to return
    const updatedTrip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    return updatedTrip!;
  });
}

export async function completeTripService(tripId: string, input: CompleteTripInput) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.status !== TripStatus.DISPATCHED) {
      throw new BadRequestError('Only active (DISPATCHED) trips can be completed');
    }

    // Odometer reading check
    if (input.odometerEnd < trip.vehicle.odometer) {
      throw new BadRequestError(`End odometer reading (${input.odometerEnd} km) cannot be less than vehicle's current odometer (${trip.vehicle.odometer} km)`);
    }

    const tripUpdate = await tx.trip.updateMany({
      where: { id: tripId, status: TripStatus.DISPATCHED },
      data: {
        status: TripStatus.COMPLETED,
        completedAt: new Date(),
        odometerEnd: input.odometerEnd,
        revenue: input.revenue ?? trip.revenue,
      },
    });
    if (tripUpdate.count === 0) {
      throw new BadRequestError('Trip has already been completed or status changed');
    }

    const vehicleUpdate = await tx.vehicle.updateMany({
      where: { id: trip.vehicleId, status: VehicleStatus.ON_TRIP },
      data: {
        status: VehicleStatus.AVAILABLE,
        odometer: input.odometerEnd,
      },
    });
    if (vehicleUpdate.count === 0) {
      throw new BadRequestError('Vehicle status changed concurrently');
    }

    const driverUpdate = await tx.driver.updateMany({
      where: { id: trip.driverId, status: DriverStatus.ON_TRIP },
      data: { status: DriverStatus.AVAILABLE },
    });
    if (driverUpdate.count === 0) {
      throw new BadRequestError('Driver status changed concurrently');
    }

    const updatedTrip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    return updatedTrip!;
  });
}

export async function cancelTripService(tripId: string) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.status !== TripStatus.DRAFT && trip.status !== TripStatus.DISPATCHED) {
      throw new BadRequestError('Only scheduled (DRAFT) or active (DISPATCHED) trips can be cancelled');
    }

    const tripUpdate = await tx.trip.updateMany({
      where: {
        id: tripId,
        status: { in: [TripStatus.DRAFT, TripStatus.DISPATCHED] },
      },
      data: { status: TripStatus.CANCELLED },
    });
    if (tripUpdate.count === 0) {
      throw new BadRequestError('Trip has already been cancelled or status changed');
    }

    // Revert vehicle and driver statuses back to AVAILABLE only if they were ON_TRIP
    if (trip.status === TripStatus.DISPATCHED) {
      const vehicleUpdate = await tx.vehicle.updateMany({
        where: { id: trip.vehicleId, status: VehicleStatus.ON_TRIP },
        data: { status: VehicleStatus.AVAILABLE },
      });
      if (vehicleUpdate.count === 0) {
        throw new BadRequestError('Vehicle status changed concurrently');
      }

      const driverUpdate = await tx.driver.updateMany({
        where: { id: trip.driverId, status: DriverStatus.ON_TRIP },
        data: { status: DriverStatus.AVAILABLE },
      });
      if (driverUpdate.count === 0) {
        throw new BadRequestError('Driver status changed concurrently');
      }
    }

    const updatedTrip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    return updatedTrip!;
  });
}
