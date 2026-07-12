import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertToCSV,
  exportVehiclesCSV,
  exportDriversCSV,
  exportTripsCSV,
  exportMaintenanceLogsCSV,
  exportFuelLogsCSV,
  exportExpensesCSV,
} from '../../src/services/export';
import { prisma } from '../../src/prisma';

vi.mock('../../src/prisma', () => ({
  prisma: {
    vehicle: {
      findMany: vi.fn(),
    },
    driver: {
      findMany: vi.fn(),
    },
    trip: {
      findMany: vi.fn(),
    },
    maintenanceLog: {
      findMany: vi.fn(),
    },
    fuelLog: {
      findMany: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
    },
  },
}));

describe('Export CSV Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertToCSV helper', () => {
    it('should correctly escape and format objects to CSV rows', () => {
      const data = [
        { name: 'Vehicle A', val: 100, nested: { prop: 'test,comma' } },
        { name: 'Vehicle B', val: 200, nested: { prop: 'no-comma' } },
      ];
      const headers = ['Vehicle Name', 'Value', 'Nested Prop'];
      const keys = ['name', 'val', 'nested.prop'];

      const result = convertToCSV(data, headers, keys);
      const lines = result.split('\r\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('Vehicle Name,Value,Nested Prop');
      expect(lines[1]).toBe('Vehicle A,100,"test,comma"');
      expect(lines[2]).toBe('Vehicle B,200,no-comma');
    });

    it('should output headers only for empty array input', () => {
      const result = convertToCSV([], ['Header A', 'Header B'], ['a', 'b']);
      expect(result).toBe('Header A,Header B');
    });
  });

  describe('exportVehiclesCSV', () => {
    it('should convert vehicles list to CSV', async () => {
      (prisma.vehicle.findMany as any).mockResolvedValue([
        {
          id: 'v-1',
          regNumber: 'REG-1',
          name: 'Truck',
          type: 'TRUCK',
          maxLoadCapacity: 5000,
          odometer: 12000,
          acquisitionCost: 45000,
          status: 'AVAILABLE',
          createdAt: new Date('2026-07-12T00:00:00.000Z'),
        },
      ]);

      const result = await exportVehiclesCSV();
      const lines = result.split('\r\n');
      expect(lines[0]).toContain('Registration Number');
      expect(lines[1]).toContain('REG-1');
    });
  });

  describe('exportTripsCSV', () => {
    it('should pull joined driver and vehicle fields correctly', async () => {
      (prisma.trip.findMany as any).mockResolvedValue([
        {
          id: 't-1',
          source: 'A',
          destination: 'B',
          cargoWeight: 100,
          plannedDistance: 200,
          odometerEnd: 250,
          revenue: 1000,
          status: 'COMPLETED',
          dispatchedAt: new Date('2026-07-12T00:00:00.000Z'),
          completedAt: new Date('2026-07-12T01:00:00.000Z'),
          createdAt: new Date('2026-07-12T00:00:00.000Z'),
          vehicle: { regNumber: 'REG-1' },
          driver: { name: 'Driver Dan' },
        },
      ]);

      const result = await exportTripsCSV();
      const lines = result.split('\r\n');
      expect(lines[0]).toContain('Vehicle Reg Number,Driver Name');
      expect(lines[1]).toContain('REG-1,Driver Dan');
    });
  });
});
