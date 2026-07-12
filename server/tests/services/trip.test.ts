import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTripService,
  dispatchTripService,
  completeTripService,
  cancelTripService,
} from '../../src/services/trip';
import { prisma } from '../../src/prisma';
import { NotFoundError, BadRequestError } from '../../src/utils/errors';
import { TripStatus, VehicleStatus, DriverStatus } from '@prisma/client';

// Mock the prisma client
vi.mock('../../src/prisma', () => ({
  prisma: {
    trip: {
      findUnique: vi.fn(),
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
    driver: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Trip Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTripService', () => {
    it('should successfully create a new trip', async () => {
      const mockInput = {
        source: 'Depot A',
        destination: 'Client B',
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        cargoWeight: 1000,
        plannedDistance: 120,
        revenue: 500,
      };

      (prisma.vehicle.findUnique as any).mockResolvedValue({ id: 'vehicle-123', maxLoadCapacity: 2000 });
      (prisma.driver.findUnique as any).mockResolvedValue({ id: 'driver-123' });
      (prisma.trip.create as any).mockResolvedValue({ id: 'trip-123', ...mockInput, status: 'DRAFT' });

      const result = await createTripService(mockInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('trip-123');
      expect(prisma.trip.create).toHaveBeenCalled();
    });

    it('should throw BadRequestError if cargo weight exceeds capacity', async () => {
      const mockInput = {
        source: 'Depot A',
        destination: 'Client B',
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        cargoWeight: 5000,
        plannedDistance: 120,
        revenue: 500,
      };

      (prisma.vehicle.findUnique as any).mockResolvedValue({ id: 'vehicle-123', maxLoadCapacity: 2000 });
      (prisma.driver.findUnique as any).mockResolvedValue({ id: 'driver-123' });

      await expect(createTripService(mockInput)).rejects.toThrow(BadRequestError);
      expect(prisma.trip.create).not.toHaveBeenCalled();
    });
  });

  describe('dispatchTripService', () => {
    it('should dispatch trip and set vehicle and driver to ON_TRIP', async () => {
      const mockTrip = {
        id: 'trip-123',
        status: TripStatus.DRAFT,
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        vehicle: { id: 'vehicle-123', regNumber: 'REG-123', status: VehicleStatus.AVAILABLE },
        driver: {
          id: 'driver-123',
          name: 'John Doe',
          status: DriverStatus.AVAILABLE,
          licenseExpiry: new Date(Date.now() + 100000000),
          safetyScore: 90,
        },
      };

      (prisma.trip.findUnique as any).mockResolvedValueOnce(mockTrip); // Find for checks
      (prisma.trip.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.vehicle.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.driver.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.trip.findUnique as any).mockResolvedValueOnce({ ...mockTrip, status: TripStatus.DISPATCHED }); // Return val

      const result = await dispatchTripService('trip-123');

      expect(result.status).toBe(TripStatus.DISPATCHED);
      expect(prisma.trip.updateMany).toHaveBeenCalledWith({
        where: { id: 'trip-123', status: TripStatus.DRAFT },
        data: { status: TripStatus.DISPATCHED, dispatchedAt: expect.any(Date) },
      });
      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: { id: 'vehicle-123', status: VehicleStatus.AVAILABLE },
        data: { status: VehicleStatus.ON_TRIP },
      });
      expect(prisma.driver.updateMany).toHaveBeenCalledWith({
        where: { id: 'driver-123', status: DriverStatus.AVAILABLE },
        data: { status: DriverStatus.ON_TRIP },
      });
    });

    it('should block dispatch if driver is suspended', async () => {
      const mockTrip = {
        id: 'trip-123',
        status: TripStatus.DRAFT,
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        vehicle: { id: 'vehicle-123', regNumber: 'REG-123', status: VehicleStatus.AVAILABLE },
        driver: {
          id: 'driver-123',
          name: 'John Doe',
          status: DriverStatus.SUSPENDED,
          licenseExpiry: new Date(Date.now() + 100000000),
          safetyScore: 90,
        },
      };

      (prisma.trip.findUnique as any).mockResolvedValue(mockTrip);

      await expect(dispatchTripService('trip-123')).rejects.toThrow(BadRequestError);
    });

    it('should block dispatch if safety score is below 50', async () => {
      const mockTrip = {
        id: 'trip-123',
        status: TripStatus.DRAFT,
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        vehicle: { id: 'vehicle-123', regNumber: 'REG-123', status: VehicleStatus.AVAILABLE },
        driver: {
          id: 'driver-123',
          name: 'John Doe',
          status: DriverStatus.AVAILABLE,
          licenseExpiry: new Date(Date.now() + 100000000),
          safetyScore: 45,
        },
      };

      (prisma.trip.findUnique as any).mockResolvedValue(mockTrip);

      await expect(dispatchTripService('trip-123')).rejects.toThrow(BadRequestError);
    });
  });

  describe('completeTripService', () => {
    it('should complete trip, update vehicle odometer and make resources AVAILABLE', async () => {
      const mockTrip = {
        id: 'trip-123',
        status: TripStatus.DISPATCHED,
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        vehicle: { id: 'vehicle-123', odometer: 1000 },
        driver: { id: 'driver-123' },
      };

      (prisma.trip.findUnique as any).mockResolvedValue(mockTrip);
      (prisma.trip.update as any).mockResolvedValue({ ...mockTrip, status: TripStatus.COMPLETED });

      const result = await completeTripService('trip-123', { odometerEnd: 1200 });

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-123' },
        data: { status: VehicleStatus.AVAILABLE, odometer: 1200 },
      });
      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: 'driver-123' },
        data: { status: DriverStatus.AVAILABLE },
      });
    });

    it('should reject complete trip if odometerEnd is less than start', async () => {
      const mockTrip = {
        id: 'trip-123',
        status: TripStatus.DISPATCHED,
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        vehicle: { id: 'vehicle-123', odometer: 1000 },
        driver: { id: 'driver-123' },
      };

      (prisma.trip.findUnique as any).mockResolvedValue(mockTrip);

      await expect(completeTripService('trip-123', { odometerEnd: 950 })).rejects.toThrow(BadRequestError);
    });
  });

  describe('cancelTripService', () => {
    it('should cancel trip and revert resource status to AVAILABLE', async () => {
      const mockTrip = {
        id: 'trip-123',
        status: TripStatus.DISPATCHED,
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
      };

      (prisma.trip.findUnique as any).mockResolvedValue(mockTrip);
      (prisma.trip.update as any).mockResolvedValue({ ...mockTrip, status: TripStatus.CANCELLED });

      await cancelTripService('trip-123');

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-123' },
        data: { status: VehicleStatus.AVAILABLE },
      });
      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: 'driver-123' },
        data: { status: DriverStatus.AVAILABLE },
      });
    });
  });
});
