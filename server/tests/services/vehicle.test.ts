import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVehicleService,
  getVehiclesService,
  updateVehicleService,
} from '../../src/services/vehicle';
import { prisma } from '../../src/prisma';
import { ConflictError, NotFoundError } from '../../src/utils/errors';
import { VehicleStatus } from '@prisma/client';

// Mock the prisma client
vi.mock('../../src/prisma', () => ({
  prisma: {
    vehicle: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Vehicle Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createVehicleService', () => {
    it('should successfully create a new vehicle', async () => {
      const mockInput = {
        regNumber: 'REG-999',
        name: 'Test Van',
        type: 'Van',
        maxLoadCapacity: 1000,
        odometer: 100,
        acquisitionCost: 25000,
        status: 'AVAILABLE' as const,
      };

      (prisma.vehicle.findUnique as any).mockResolvedValue(null);
      (prisma.vehicle.create as any).mockResolvedValue({ id: 'vehicle-123', ...mockInput });

      const result = await createVehicleService(mockInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('vehicle-123');
      expect(result.regNumber).toBe('REG-999');
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if registration number already exists', async () => {
      const mockInput = {
        regNumber: 'REG-999',
        name: 'Test Van',
        type: 'Van',
        maxLoadCapacity: 1000,
        odometer: 100,
        acquisitionCost: 25000,
        status: 'AVAILABLE' as const,
      };

      (prisma.vehicle.findUnique as any).mockResolvedValue({ id: 'existing-id', regNumber: 'REG-999' });

      await expect(createVehicleService(mockInput)).rejects.toThrow(ConflictError);
      expect(prisma.vehicle.create).not.toHaveBeenCalled();
    });
  });

  describe('getVehiclesService', () => {
    it('should return only AVAILABLE vehicles when dispatchable is true', async () => {
      await getVehiclesService({ dispatchable: true });

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: {
          status: VehicleStatus.AVAILABLE,
        },
        orderBy: { regNumber: 'asc' },
      });
    });

    it('should return all vehicles when dispatchable is not specified', async () => {
      await getVehiclesService();

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateVehicleService', () => {
    it('should successfully update an existing vehicle', async () => {
      const mockInput = {
        regNumber: 'REG-888',
        name: 'Updated Name',
        type: 'Van',
        maxLoadCapacity: 1000,
        odometer: 150,
        acquisitionCost: 25000,
        status: 'AVAILABLE' as const,
      };

      (prisma.vehicle.findUnique as any).mockResolvedValueOnce({
        id: 'vehicle-123',
        regNumber: 'REG-123',
      });
      (prisma.vehicle.findUnique as any).mockResolvedValueOnce(null); // No collision on new regNumber
      (prisma.vehicle.update as any).mockResolvedValue({ id: 'vehicle-123', ...mockInput });

      const result = await updateVehicleService('vehicle-123', mockInput);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Name');
      expect(prisma.vehicle.update).toHaveBeenCalled();
    });

    it('should throw ConflictError if updating to a registration number used by another vehicle', async () => {
      const mockInput = {
        regNumber: 'REG-888',
        name: 'Updated Name',
        type: 'Van',
        maxLoadCapacity: 1000,
        odometer: 150,
        acquisitionCost: 25000,
        status: 'AVAILABLE' as const,
      };

      // Exists check 1: find vehicle to update
      (prisma.vehicle.findUnique as any).mockResolvedValueOnce({
        id: 'vehicle-123',
        regNumber: 'REG-123',
      });
      // Exists check 2: find collision
      (prisma.vehicle.findUnique as any).mockResolvedValueOnce({
        id: 'another-vehicle',
        regNumber: 'REG-888',
      });

      await expect(updateVehicleService('vehicle-123', mockInput)).rejects.toThrow(ConflictError);
      expect(prisma.vehicle.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if vehicle to update does not exist', async () => {
      (prisma.vehicle.findUnique as any).mockResolvedValue(null);

      await expect(updateVehicleService('invalid-id', { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });
});
