import { prisma } from '../prisma';
import { NotFoundError } from '../utils/errors';
import { CreateExpenseInput } from 'shared';

export async function createExpenseService(input: CreateExpenseInput) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
  });

  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  return prisma.expense.create({
    data: {
      vehicleId: input.vehicleId,
      type: input.type,
      amount: input.amount,
      date: input.date || new Date(),
    },
    include: {
      vehicle: true,
    },
  });
}

export async function getExpensesService(filters?: { vehicleId?: string }) {
  if (filters?.vehicleId) {
    return prisma.expense.findMany({
      where: { vehicleId: filters.vehicleId },
      include: { vehicle: true },
      orderBy: { date: 'desc' },
    });
  }

  return prisma.expense.findMany({
    include: { vehicle: true },
    orderBy: { date: 'desc' },
  });
}
