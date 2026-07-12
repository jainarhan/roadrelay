import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFuelLogService, getFuelLogsService } from '../../src/services/fuel';
import { prisma } from '../../src/prisma';
import { NotFoundError } from '../../src/utils/errors';

vi.mock('../../src/prisma', () => ({
  prisma: {
    fuelLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
    },
    trip: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Fuel Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFuelLogService', () => {
    it('should successfully create a fuel log', async () => {
      const mockVehicle = { id: 'vehicle-123' };
      const mockTrip = { id: 'trip-123' };
      const mockFuelLog = { id: 'log-123', vehicleId: 'vehicle-123', tripId: 'trip-123', liters: 50, cost: 100 };

      (prisma.vehicle.findUnique as any).mockResolvedValue(mockVehicle);
      (prisma.trip.findUnique as any).mockResolvedValue(mockTrip);
      (prisma.fuelLog.create as any).mockResolvedValue(mockFuelLog);

      const result = await createFuelLogService({
        vehicleId: 'vehicle-123',
        tripId: 'trip-123',
        liters: 50,
        cost: 100,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('log-123');
      expect(prisma.fuelLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError if vehicle not found', async () => {
      (prisma.vehicle.findUnique as any).mockResolvedValue(null);

      await expect(
        createFuelLogService({
          vehicleId: 'vehicle-invalid',
          liters: 50,
          cost: 100,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if trip not found', async () => {
      const mockVehicle = { id: 'vehicle-123' };
      (prisma.vehicle.findUnique as any).mockResolvedValue(mockVehicle);
      (prisma.trip.findUnique as any).mockResolvedValue(null);

      await expect(
        createFuelLogService({
          vehicleId: 'vehicle-123',
          tripId: 'trip-invalid',
          liters: 50,
          cost: 100,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getFuelLogsService', () => {
    it('should query all fuel logs', async () => {
      await getFuelLogsService();
      expect(prisma.fuelLog.findMany).toHaveBeenCalled();
    });

    it('should filter by vehicleId when specified', async () => {
      await getFuelLogsService({ vehicleId: 'vehicle-123' });
      expect(prisma.fuelLog.findMany).toHaveBeenCalledWith({
        where: { vehicleId: 'vehicle-123' },
        include: { vehicle: true, trip: true },
        orderBy: { date: 'desc' },
      });
    });
  });
});
