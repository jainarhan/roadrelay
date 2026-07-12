import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDriverService,
  getDriversService,
  updateDriverService,
} from '../../src/services/driver';
import { prisma } from '../../src/prisma';
import { ConflictError, NotFoundError } from '../../src/utils/errors';
import { DriverStatus } from '@prisma/client';

// Mock the prisma client
vi.mock('../../src/prisma', () => ({
  prisma: {
    driver: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Driver Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDriverService', () => {
    it('should successfully create a new driver', async () => {
      const mockInput = {
        name: 'New Driver',
        licenseNumber: 'LIC-999',
        licenseCategory: 'Heavy Combo',
        licenseExpiry: new Date('2028-12-31'),
        contact: '+99999999',
        safetyScore: 95,
        status: 'AVAILABLE' as const,
      };

      (prisma.driver.findUnique as any).mockResolvedValue(null);
      (prisma.driver.create as any).mockResolvedValue({ id: 'driver-123', ...mockInput });

      const result = await createDriverService(mockInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('driver-123');
      expect(result.licenseNumber).toBe('LIC-999');
      expect(prisma.driver.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if license number already exists', async () => {
      const mockInput = {
        name: 'New Driver',
        licenseNumber: 'LIC-999',
        licenseCategory: 'Heavy Combo',
        licenseExpiry: new Date('2028-12-31'),
        contact: '+99999999',
        safetyScore: 95,
        status: 'AVAILABLE' as const,
      };

      (prisma.driver.findUnique as any).mockResolvedValue({ id: 'existing-id', licenseNumber: 'LIC-999' });

      await expect(createDriverService(mockInput)).rejects.toThrow(ConflictError);
      expect(prisma.driver.create).not.toHaveBeenCalled();
    });
  });

  describe('getDriversService', () => {
    it('should filter only AVAILABLE and non-expired drivers when dispatchable is true', async () => {
      await getDriversService({ dispatchable: true });

      expect(prisma.driver.findMany).toHaveBeenCalledWith({
        where: {
          status: DriverStatus.AVAILABLE,
          licenseExpiry: {
            gt: expect.any(Date),
          },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return all drivers when dispatchable is not specified', async () => {
      await getDriversService();

      expect(prisma.driver.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateDriverService', () => {
    it('should successfully update an existing driver', async () => {
      const mockInput = {
        name: 'Updated Driver',
        licenseNumber: 'LIC-888',
        licenseCategory: 'Heavy Combo',
        licenseExpiry: new Date('2028-12-31'),
        contact: '+99999999',
        safetyScore: 95,
        status: 'AVAILABLE' as const,
      };

      (prisma.driver.findUnique as any).mockResolvedValueOnce({
        id: 'driver-123',
        licenseNumber: 'LIC-123',
      });
      (prisma.driver.findUnique as any).mockResolvedValueOnce(null);
      (prisma.driver.update as any).mockResolvedValue({ id: 'driver-123', ...mockInput });

      const result = await updateDriverService('driver-123', mockInput);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Driver');
      expect(prisma.driver.update).toHaveBeenCalled();
    });

    it('should throw ConflictError if license number is taken by another driver', async () => {
      const mockInput = {
        name: 'Updated Driver',
        licenseNumber: 'LIC-888',
        licenseCategory: 'Heavy Combo',
        licenseExpiry: new Date('2028-12-31'),
        contact: '+99999999',
        safetyScore: 95,
        status: 'AVAILABLE' as const,
      };

      (prisma.driver.findUnique as any).mockResolvedValueOnce({
        id: 'driver-123',
        licenseNumber: 'LIC-123',
      });
      (prisma.driver.findUnique as any).mockResolvedValueOnce({
        id: 'another-driver',
        licenseNumber: 'LIC-888',
      });

      await expect(updateDriverService('driver-123', mockInput)).rejects.toThrow(ConflictError);
      expect(prisma.driver.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if driver to update does not exist', async () => {
      (prisma.driver.findUnique as any).mockResolvedValue(null);

      await expect(updateDriverService('invalid-id', { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });
});
