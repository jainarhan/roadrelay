import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardSummaryService } from '../../src/services/dashboard';
import { prisma } from '../../src/prisma';
import { VehicleStatus, TripStatus, DriverStatus } from '@prisma/client';

vi.mock('../../src/prisma', () => ({
  prisma: {
    vehicle: {
      count: vi.fn(),
    },
    trip: {
      count: vi.fn(),
    },
    driver: {
      count: vi.fn(),
    },
  },
}));

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully aggregate statistics and compute fleet utilization percentage', async () => {
    // Mock the returns for count queries:
    // 1. activeVehicles (status != RETIRED) -> 10
    // 2. availableVehicles (status == AVAILABLE) -> 5
    // 3. vehiclesInMaintenance (status == IN_SHOP) -> 3
    // 4. vehiclesOnTrip (status == ON_TRIP) -> 2
    // 5. activeTrips (status == DISPATCHED) -> 2
    // 6. pendingTrips (status == DRAFT) -> 4
    // 7. driversOnDuty (status == ON_TRIP) -> 2
    (prisma.vehicle.count as any)
      .mockResolvedValueOnce(10) // active
      .mockResolvedValueOnce(5)  // available
      .mockResolvedValueOnce(3)  // in shop
      .mockResolvedValueOnce(2); // on trip

    (prisma.trip.count as any)
      .mockResolvedValueOnce(2)  // active trips
      .mockResolvedValueOnce(4); // pending trips

    (prisma.driver.count as any)
      .mockResolvedValueOnce(2); // drivers on trip

    const result = await getDashboardSummaryService();

    expect(result).toBeDefined();
    expect(result.activeVehicles).toBe(10);
    expect(result.availableVehicles).toBe(5);
    expect(result.vehiclesInMaintenance).toBe(3);
    expect(result.activeTrips).toBe(2);
    expect(result.pendingTrips).toBe(4);
    expect(result.driversOnDuty).toBe(2);
    // Utilization calculation: (ON_TRIP: 2 + IN_SHOP: 3) / ACTIVE: 10 * 100 = 50.0%
    expect(result.fleetUtilization).toBe(50.0);

    expect(prisma.vehicle.count).toHaveBeenCalledTimes(4);
    expect(prisma.trip.count).toHaveBeenCalledTimes(2);
    expect(prisma.driver.count).toHaveBeenCalledTimes(1);
  });

  it('should handle division by zero if activeVehicles count is zero', async () => {
    (prisma.vehicle.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    (prisma.trip.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    (prisma.driver.count as any)
      .mockResolvedValueOnce(0);

    const result = await getDashboardSummaryService();

    expect(result.fleetUtilization).toBe(0.0);
  });
});
