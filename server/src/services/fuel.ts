import { prisma } from '../prisma';
import { NotFoundError } from '../utils/errors';
import { CreateFuelLogInput } from 'shared';

export async function createFuelLogService(input: CreateFuelLogInput) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
  });

  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  if (input.tripId) {
    const trip = await prisma.trip.findUnique({
      where: { id: input.tripId },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }
  }

  return prisma.fuelLog.create({
    data: {
      vehicleId: input.vehicleId,
      tripId: input.tripId || null,
      liters: input.liters,
      cost: input.cost,
      date: input.date || new Date(),
    },
    include: {
      vehicle: true,
      trip: true,
    },
  });
}

export async function getFuelLogsService(filters?: { vehicleId?: string }) {
  if (filters?.vehicleId) {
    return prisma.fuelLog.findMany({
      where: { vehicleId: filters.vehicleId },
      include: { vehicle: true, trip: true },
      orderBy: { date: 'desc' },
    });
  }

  return prisma.fuelLog.findMany({
    include: { vehicle: true, trip: true },
    orderBy: { date: 'desc' },
  });
}
