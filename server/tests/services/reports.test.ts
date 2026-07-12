import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFuelEfficiencyReportService,
  getFleetUtilizationReportService,
  getOperationalCostReportService,
  getVehicleRoiReportService,
} from '../../src/services/reports';
import { prisma } from '../../src/prisma';

vi.mock('../../src/prisma', () => ({
  prisma: {
    vehicle: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    fuelLog: {
      groupBy: vi.fn(),
    },
    trip: {
      groupBy: vi.fn(),
    },
    maintenanceLog: {
      groupBy: vi.fn(),
    },
  },
}));

describe('Reports Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFuelEfficiencyReportService', () => {
    it('should successfully aggregate distance and liters and calculate efficiency', async () => {
      const mockVehicles = [
        { id: 'vehicle-1', regNumber: 'REG-1', name: 'Truck A' },
        { id: 'vehicle-2', regNumber: 'REG-2', name: 'Van B' },
      ];
      (prisma.vehicle.findMany as any).mockResolvedValue(mockVehicles);

      (prisma.fuelLog.groupBy as any).mockResolvedValue([
        { vehicleId: 'vehicle-1', _sum: { liters: 100 } },
        { vehicleId: 'vehicle-2', _sum: { liters: 0 } }, // test divide by zero
      ]);

      (prisma.trip.groupBy as any).mockResolvedValue([
        { vehicleId: 'vehicle-1', _sum: { plannedDistance: 500 } },
        { vehicleId: 'vehicle-2', _sum: { plannedDistance: 300 } },
      ]);

      const result = await getFuelEfficiencyReportService();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        vehicleId: 'vehicle-1',
        regNumber: 'REG-1',
        name: 'Truck A',
        totalDistance: 500,
        totalLiters: 100,
        efficiency: 5.0, // 500 / 100
      });
      expect(result[1].efficiency).toBeNull(); // 300 / 0 should be null
    });
  });

  describe('getFleetUtilizationReportService', () => {
    it('should successfully calculate type-wise utilization', async () => {
      (prisma.vehicle.groupBy as any)
        .mockResolvedValueOnce([
          { type: 'Truck', _count: { id: 10 } },
          { type: 'Van', _count: { id: 5 } },
        ])
        .mockResolvedValueOnce([
          { type: 'Truck', _count: { id: 4 } },
          { type: 'Van', _count: { id: 1 } },
        ]);

      const result = await getFleetUtilizationReportService();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        vehicleType: 'Truck',
        totalVehicles: 10,
        activeVehicles: 4,
        utilizationPct: 40.0,
      });
      expect(result[1]).toEqual({
        vehicleType: 'Van',
        totalVehicles: 5,
        activeVehicles: 1,
        utilizationPct: 20.0,
      });
    });
  });

  describe('getOperationalCostReportService', () => {
    it('should successfully sum fuel and maintenance costs', async () => {
      const mockVehicles = [{ id: 'vehicle-1', regNumber: 'REG-1', name: 'Truck A' }];
      (prisma.vehicle.findMany as any).mockResolvedValue(mockVehicles);

      (prisma.fuelLog.groupBy as any).mockResolvedValue([
        { vehicleId: 'vehicle-1', _sum: { cost: 150.5 } },
      ]);
      (prisma.maintenanceLog.groupBy as any).mockResolvedValue([
        { vehicleId: 'vehicle-1', _sum: { cost: 250.0 } },
      ]);

      const result = await getOperationalCostReportService();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        vehicleId: 'vehicle-1',
        regNumber: 'REG-1',
        name: 'Truck A',
        totalFuelCost: 150.5,
        totalMaintenanceCost: 250.0,
        totalOperationalCost: 400.5,
      });
    });
  });

  describe('getVehicleRoiReportService', () => {
    it('should successfully calculate vehicle ROI percentage', async () => {
      const mockVehicles = [
        { id: 'vehicle-1', regNumber: 'REG-1', name: 'Truck A', acquisitionCost: 50000 },
        { id: 'vehicle-2', regNumber: 'REG-2', name: 'Van B', acquisitionCost: 0 }, // test divide by zero
      ];
      (prisma.vehicle.findMany as any).mockResolvedValue(mockVehicles);

      (prisma.trip.groupBy as any).mockResolvedValue([
        { vehicleId: 'vehicle-1', _sum: { revenue: 10000 } },
        { vehicleId: 'vehicle-2', _sum: { revenue: 5000 } },
      ]);
      (prisma.fuelLog.groupBy as any).mockResolvedValue([
        { vehicleId: 'vehicle-1', _sum: { cost: 2000 } },
        { vehicleId: 'vehicle-2', _sum: { cost: 1000 } },
      ]);
      (prisma.maintenanceLog.groupBy as any).mockResolvedValue([
        { vehicleId: 'vehicle-1', _sum: { cost: 3000 } },
        { vehicleId: 'vehicle-2', _sum: { cost: 1000 } },
      ]);

      const result = await getVehicleRoiReportService();

      expect(result).toHaveLength(2);
      // ROI: (10000 - (2000 + 3000)) / 50000 = 5000 / 50000 = 0.100 (10.0%)
      expect(result[0]).toEqual({
        vehicleId: 'vehicle-1',
        regNumber: 'REG-1',
        name: 'Truck A',
        totalRevenue: 10000,
        totalCost: 5000,
        acquisitionCost: 50000,
        roi: 0.1,
        roiPercent: 10.0,
      });
      expect(result[1].roi).toBeNull();
    });
  });
});
