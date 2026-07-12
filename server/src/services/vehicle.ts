import { prisma } from '../prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import { CreateVehicleInput, UpdateVehicleInput } from 'shared';
import { VehicleStatus, Prisma } from '@prisma/client';

export async function createVehicleService(input: CreateVehicleInput) {
  const existing = await prisma.vehicle.findUnique({
    where: { regNumber: input.regNumber },
  });

  if (existing) {
    throw new ConflictError('Vehicle registration number already exists');
  }

  try {
    return await prisma.vehicle.create({
      data: {
        regNumber: input.regNumber,
        name: input.name,
        type: input.type,
        maxLoadCapacity: input.maxLoadCapacity,
        odometer: input.odometer,
        acquisitionCost: input.acquisitionCost,
        status: VehicleStatus.AVAILABLE, // Hardcoded default
      },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Vehicle registration number already exists');
    }
    throw error;
  }
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

  try {
    return await prisma.vehicle.update({
      where: { id },
      data: {
        regNumber: input.regNumber,
        name: input.name,
        type: input.type,
        maxLoadCapacity: input.maxLoadCapacity,
        odometer: input.odometer,
        acquisitionCost: input.acquisitionCost,
        // Status is deliberately omitted here to prevent generic status modifications
      },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Vehicle registration number already exists');
    }
    throw error;
  }
}
