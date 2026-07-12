import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExpenseService, getExpensesService } from '../../src/services/expense';
import { prisma } from '../../src/prisma';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/prisma', () => ({
  prisma: {
    expense: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Expense Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExpenseService', () => {
    it('should successfully create an expense entry', async () => {
      const mockVehicle = { id: 'vehicle-123' };
      const mockExpense = { id: 'expense-123', vehicleId: 'vehicle-123', type: 'TOLL', amount: 45 };

      (prisma.vehicle.findUnique as any).mockResolvedValue(mockVehicle);
      (prisma.expense.create as any).mockResolvedValue(mockExpense);

      const result = await createExpenseService({
        vehicleId: 'vehicle-123',
        type: 'TOLL',
        amount: 45,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('expense-123');
      expect(prisma.expense.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError if vehicle not found', async () => {
      (prisma.vehicle.findUnique as any).mockResolvedValue(null);

      await expect(
        createExpenseService({
          vehicleId: 'vehicle-invalid',
          type: 'TOLL',
          amount: 45,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getExpensesService', () => {
    it('should query all expenses', async () => {
      await getExpensesService();
      expect(prisma.expense.findMany).toHaveBeenCalled();
    });

    it('should filter by vehicleId when specified', async () => {
      await getExpensesService({ vehicleId: 'vehicle-123' });
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { vehicleId: 'vehicle-123' },
        include: { vehicle: true },
        orderBy: { date: 'desc' },
      });
    });
  });
});
