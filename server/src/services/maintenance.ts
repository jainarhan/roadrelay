import { prisma } from '../prisma';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CreateMaintenanceInput } from 'shared';
import { VehicleStatus } from '@prisma/client';

export async function createMaintenanceLogService(input: CreateMaintenanceInput) {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({
      where: { id: input.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Prevent placing a vehicle in maintenance if it is not AVAILABLE
    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestError('Only AVAILABLE vehicles can be placed in maintenance');
    }

    // Block if the vehicle already has any active maintenance logs
    const existingActiveLog = await tx.maintenanceLog.findFirst({
      where: { vehicleId: input.vehicleId, active: true },
    });
    if (existingActiveLog) {
      throw new BadRequestError('Vehicle already has an active maintenance log');
    }

    // Conditional update to prevent double-booking/race condition
    const vehicleUpdate = await tx.vehicle.updateMany({
      where: {
        id: input.vehicleId,
        status: VehicleStatus.AVAILABLE,
      },
      data: { status: VehicleStatus.IN_SHOP },
    });

    if (vehicleUpdate.count === 0) {
      throw new BadRequestError('Vehicle is no longer available for maintenance — status changed');
    }

    return tx.maintenanceLog.create({
      data: {
        vehicleId: input.vehicleId,
        description: input.description,
        active: true,
        openedAt: new Date(),
      },
      include: {
        vehicle: true,
      },
    });
  });
}

export async function getMaintenanceLogsService(filters?: { vehicleId?: string }) {
  if (filters?.vehicleId) {
    return prisma.maintenanceLog.findMany({
      where: { vehicleId: filters.vehicleId },
      include: { vehicle: true },
      orderBy: { openedAt: 'desc' },
    });
  }

  return prisma.maintenanceLog.findMany({
    include: { vehicle: true },
    orderBy: { openedAt: 'desc' },
  });
}

export async function closeMaintenanceLogService(id: string) {
  return prisma.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!log) {
      throw new NotFoundError('Maintenance log not found');
    }

    if (!log.active) {
      throw new BadRequestError('Maintenance log is already closed');
    }

    const logUpdate = await tx.maintenanceLog.updateMany({
      where: { id, active: true },
      data: {
        active: false,
        closedAt: new Date(),
      },
    });
    if (logUpdate.count === 0) {
      throw new BadRequestError('Maintenance log was already closed');
    }

    // Check if any OTHER active logs remain for this vehicle before reverting status
    const remainingActiveLogs = await tx.maintenanceLog.count({
      where: { vehicleId: log.vehicleId, active: true },
    });

    // Side effect: update vehicle status back to AVAILABLE, UNLESS it has been RETIRED or other active logs remain
    if (remainingActiveLogs === 0 && log.vehicle.status === VehicleStatus.IN_SHOP) {
      const vehicleUpdate = await tx.vehicle.updateMany({
        where: { id: log.vehicleId, status: VehicleStatus.IN_SHOP },
        data: { status: VehicleStatus.AVAILABLE },
      });
      if (vehicleUpdate.count === 0) {
        throw new BadRequestError('Vehicle status changed concurrently');
      }
    }

    const updatedLog = await tx.maintenanceLog.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    return updatedLog!;
  });
}
