import { prisma } from '../prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import { CreateDriverInput, UpdateDriverInput } from 'shared';
import { DriverStatus, Prisma } from '@prisma/client';

export async function createDriverService(input: CreateDriverInput) {
  const existing = await prisma.driver.findUnique({
    where: { licenseNumber: input.licenseNumber },
  });

  if (existing) {
    throw new ConflictError('Driver license number already exists');
  }

  try {
    return await prisma.driver.create({
      data: {
        name: input.name,
        licenseNumber: input.licenseNumber,
        licenseCategory: input.licenseCategory,
        licenseExpiry: input.licenseExpiry,
        contact: input.contact,
        safetyScore: input.safetyScore,
        status: input.status as DriverStatus,
      },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Driver license number already exists');
    }
    throw error;
  }
}

export async function getDriversService(filters?: { dispatchable?: boolean }) {
  if (filters?.dispatchable) {
    const now = new Date();
    return prisma.driver.findMany({
      where: {
        status: DriverStatus.AVAILABLE,
        licenseExpiry: {
          gt: now,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  return prisma.driver.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateDriverService(id: string, input: UpdateDriverInput) {
  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  if (input.licenseNumber && input.licenseNumber !== driver.licenseNumber) {
    const existing = await prisma.driver.findUnique({
      where: { licenseNumber: input.licenseNumber },
    });

    if (existing) {
      throw new ConflictError('Driver license number already exists');
    }
  }

  try {
    return await prisma.driver.update({
      where: { id },
      data: {
        name: input.name,
        licenseNumber: input.licenseNumber,
        licenseCategory: input.licenseCategory,
        licenseExpiry: input.licenseExpiry,
        contact: input.contact,
        safetyScore: input.safetyScore,
        status: input.status as DriverStatus,
      },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Driver license number already exists');
    }
    throw error;
  }
}
