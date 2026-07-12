import { prisma } from '../prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import { CreateVehicleInput, UpdateVehicleInput } from 'shared';
import { VehicleStatus } from '@prisma/client';

export async function createVehicleService(input: CreateVehicleInput) {
  const existing = await prisma.vehicle.findUnique({
    where: { regNumber: input.regNumber },
  });

  if (existing) {
    throw new ConflictError('Vehicle registration number already exists');
  }

  return prisma.vehicle.create({
    data: {
      regNumber: input.regNumber,
      name: input.name,
      type: input.type,
      maxLoadCapacity: input.maxLoadCapacity,
      odometer: input.odometer,
      acquisitionCost: input.acquisitionCost,
      status: input.status as VehicleStatus,
    },
  });
}

export async function getVehiclesService(filters?: { dispatchable?: boolean }) {
  if (filters?.dispatchable) {
    return prisma.vehicle.findMany({
      where: {
        status: VehicleStatus.AVAILABLE,
      },
      orderBy: { regNumber: 'asc' },
    });
  }

  return prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateVehicleService(id: string, input: UpdateVehicleInput) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  if (input.regNumber && input.regNumber !== vehicle.regNumber) {
    const existing = await prisma.vehicle.findUnique({
      where: { regNumber: input.regNumber },
    });

    if (existing) {
      throw new ConflictError('Vehicle registration number already exists');
    }
  }

  return prisma.vehicle.update({
    where: { id },
    data: {
      regNumber: input.regNumber,
      name: input.name,
      type: input.type,
      maxLoadCapacity: input.maxLoadCapacity,
      odometer: input.odometer,
      acquisitionCost: input.acquisitionCost,
      status: input.status as VehicleStatus,
    },
  });
}
