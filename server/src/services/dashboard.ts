import { prisma } from '../prisma';
import { VehicleStatus, TripStatus, DriverStatus } from '@prisma/client';

export async function getDashboardSummaryService() {
  const [
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    vehiclesOnTrip,
    activeTrips,
    pendingTrips,
    driversOnDuty,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { status: { not: VehicleStatus.RETIRED } } }),
    prisma.vehicle.count({ where: { status: VehicleStatus.AVAILABLE } }),
    prisma.vehicle.count({ where: { status: VehicleStatus.IN_SHOP } }),
    prisma.vehicle.count({ where: { status: VehicleStatus.ON_TRIP } }),
    prisma.trip.count({ where: { status: TripStatus.DISPATCHED } }),
    prisma.trip.count({ where: { status: TripStatus.DRAFT } }),
    prisma.driver.count({ where: { status: DriverStatus.ON_TRIP } }),
  ]);

  const fleetUtilization = activeVehicles > 0
    ? parseFloat((((vehiclesOnTrip + vehiclesInMaintenance) / activeVehicles) * 100).toFixed(1))
    : 0.0;

  return {
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilization,
  };
}
