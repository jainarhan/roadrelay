import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMaintenanceLogService,
  closeMaintenanceLogService,
  getMaintenanceLogsService,
} from '../../src/services/maintenance';
import { prisma } from '../../src/prisma';
import { NotFoundError, BadRequestError } from '../../src/utils/errors';
import { VehicleStatus } from '@prisma/client';

// Mock the prisma client
vi.mock('../../src/prisma', () => ({
  prisma: {
    maintenanceLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Maintenance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMaintenanceLogService', () => {
    it('should successfully create a log and place vehicle IN_SHOP', async () => {
      const mockVehicle = { id: 'vehicle-123', status: VehicleStatus.AVAILABLE };
      (prisma.vehicle.findUnique as any).mockResolvedValue(mockVehicle);
      (prisma.maintenanceLog.findFirst as any).mockResolvedValue(null); // No existing active log
      (prisma.vehicle.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.maintenanceLog.create as any).mockResolvedValue({
        id: 'log-123',
        vehicleId: 'vehicle-123',
        description: 'Oil change',
        active: true,
      });

      const result = await createMaintenanceLogService({
        vehicleId: 'vehicle-123',
        description: 'Oil change',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('log-123');
      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'vehicle-123',
          status: VehicleStatus.AVAILABLE,
        },
        data: { status: VehicleStatus.IN_SHOP },
      });
    });

    it('should reject maintenance log if vehicle is currently ON_TRIP', async () => {
      const mockVehicle = { id: 'vehicle-123', status: VehicleStatus.ON_TRIP };
      (prisma.vehicle.findUnique as any).mockResolvedValue(mockVehicle);

      await expect(
        createMaintenanceLogService({
          vehicleId: 'vehicle-123',
          description: 'Oil change',
        })
      ).rejects.toThrow(BadRequestError);

      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it('should reject maintenance log if vehicle already has an active log', async () => {
      const mockVehicle = { id: 'vehicle-123', status: VehicleStatus.AVAILABLE };
      (prisma.vehicle.findUnique as any).mockResolvedValue(mockVehicle);
      (prisma.maintenanceLog.findFirst as any).mockResolvedValue({ id: 'active-log-id' }); // Active log exists

      await expect(
        createMaintenanceLogService({
          vehicleId: 'vehicle-123',
          description: 'Oil change',
        })
      ).rejects.toThrow(BadRequestError);

      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('closeMaintenanceLogService', () => {
    it('should close log and restore vehicle status to AVAILABLE if it is the last active log', async () => {
      const mockLog = {
        id: 'log-123',
        vehicleId: 'vehicle-123',
        active: true,
        vehicle: { id: 'vehicle-123', status: VehicleStatus.IN_SHOP },
      };

      (prisma.maintenanceLog.findUnique as any).mockResolvedValueOnce(mockLog);
      (prisma.maintenanceLog.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.maintenanceLog.count as any).mockResolvedValue(0); // 0 remaining active logs
      (prisma.vehicle.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.maintenanceLog.findUnique as any).mockResolvedValueOnce({ ...mockLog, active: false });

      await closeMaintenanceLogService('log-123');

      expect(prisma.maintenanceLog.updateMany).toHaveBeenCalledWith({
        where: { id: 'log-123', active: true },
        data: { active: false, closedAt: expect.any(Date) },
      });
      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: { id: 'vehicle-123', status: VehicleStatus.IN_SHOP },
        data: { status: VehicleStatus.AVAILABLE },
      });
    });

    it('should close log and NOT restore vehicle status to AVAILABLE if other active logs remain', async () => {
      const mockLog = {
        id: 'log-123',
        vehicleId: 'vehicle-123',
        active: true,
        vehicle: { id: 'vehicle-123', status: VehicleStatus.IN_SHOP },
      };

      (prisma.maintenanceLog.findUnique as any).mockResolvedValueOnce(mockLog);
      (prisma.maintenanceLog.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.maintenanceLog.count as any).mockResolvedValue(1); // 1 remaining active log (different issue)
      (prisma.maintenanceLog.findUnique as any).mockResolvedValueOnce({ ...mockLog, active: false });

      await closeMaintenanceLogService('log-123');

      expect(prisma.maintenanceLog.updateMany).toHaveBeenCalled();
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled(); // Should not revert vehicle status yet
    });

    it('should close log and leave vehicle status as RETIRED if it is retired', async () => {
      const mockLog = {
        id: 'log-123',
        vehicleId: 'vehicle-123',
        active: true,
        vehicle: { id: 'vehicle-123', status: VehicleStatus.RETIRED },
      };

      (prisma.maintenanceLog.findUnique as any).mockResolvedValueOnce(mockLog);
      (prisma.maintenanceLog.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.maintenanceLog.count as any).mockResolvedValue(0);
      (prisma.maintenanceLog.findUnique as any).mockResolvedValueOnce({ ...mockLog, active: false });

      await closeMaintenanceLogService('log-123');

      expect(prisma.maintenanceLog.updateMany).toHaveBeenCalled();
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if log is already closed', async () => {
      const mockLog = {
        id: 'log-123',
        vehicleId: 'vehicle-123',
        active: false,
        vehicle: { id: 'vehicle-123', status: VehicleStatus.AVAILABLE },
      };

      (prisma.maintenanceLog.findUnique as any).mockResolvedValue(mockLog);

      await expect(closeMaintenanceLogService('log-123')).rejects.toThrow(BadRequestError);
    });
  });
});
