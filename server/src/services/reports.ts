import { prisma } from '../prisma';
import { TripStatus } from '@prisma/client';

export async function getFuelEfficiencyReportService() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: 'RETIRED' } },
    select: { id: true, regNumber: true, name: true },
  });

  const fuelSums = await prisma.fuelLog.groupBy({
    by: ['vehicleId'],
    _sum: { liters: true },
  });

  const tripSums = await prisma.trip.groupBy({
    by: ['vehicleId'],
    where: { status: TripStatus.COMPLETED },
    _sum: { plannedDistance: true },
  });

  return vehicles.map((v) => {
    const totalLiters = Number(fuelSums.find((f) => f.vehicleId === v.id)?._sum.liters || 0);
    const totalDistance = Number(tripSums.find((t) => t.vehicleId === v.id)?._sum.plannedDistance || 0);
    const efficiency = totalLiters > 0 ? parseFloat((totalDistance / totalLiters).toFixed(2)) : null;

    return {
      vehicleId: v.id,
      regNumber: v.regNumber,
      name: v.name,
      totalDistance,
      totalLiters,
      efficiency,
    };
  });
}

export async function getFleetUtilizationReportService() {
  const totalPerType = await prisma.vehicle.groupBy({
    by: ['type'],
    where: { status: { not: 'RETIRED' } },
    _count: { id: true },
  });

  const activePerType = await prisma.vehicle.groupBy({
    by: ['type'],
    where: {
      status: { in: ['ON_TRIP', 'IN_SHOP'] },
    },
    _count: { id: true },
  });

  return totalPerType.map((t) => {
    const total = Number(t._count.id || 0);
    const active = Number(activePerType.find((a) => a.type === t.type)?._count.id || 0);
    const utilizationPct = total > 0 ? parseFloat(((active / total) * 100).toFixed(1)) : 0.0;

    return {
      vehicleType: t.type,
      totalVehicles: total,
      activeVehicles: active,
      utilizationPct,
    };
  });
}

export async function getOperationalCostReportService() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: 'RETIRED' } },
    select: { id: true, regNumber: true, name: true },
  });

  const fuelCosts = await prisma.fuelLog.groupBy({
    by: ['vehicleId'],
    _sum: { cost: true },
  });

  const maintenanceCosts = await prisma.maintenanceLog.groupBy({
    by: ['vehicleId'],
    _sum: { cost: true },
  });

  return vehicles.map((v) => {
    const totalFuelCost = Number(fuelCosts.find((f) => f.vehicleId === v.id)?._sum.cost || 0);
    const totalMaintenanceCost = Number(maintenanceCosts.find((m) => m.vehicleId === v.id)?._sum.cost || 0);
    const totalOperationalCost = parseFloat((totalFuelCost + totalMaintenanceCost).toFixed(2));

    return {
      vehicleId: v.id,
      regNumber: v.regNumber,
      name: v.name,
      totalFuelCost,
      totalMaintenanceCost,
      totalOperationalCost,
    };
  });
}

export async function getVehicleRoiReportService() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: 'RETIRED' } },
    select: { id: true, regNumber: true, name: true, acquisitionCost: true },
  });

  const tripRevenues = await prisma.trip.groupBy({
    by: ['vehicleId'],
    where: { status: TripStatus.COMPLETED },
    _sum: { revenue: true },
  });

  const fuelCosts = await prisma.fuelLog.groupBy({
    by: ['vehicleId'],
    _sum: { cost: true },
  });

  const maintenanceCosts = await prisma.maintenanceLog.groupBy({
    by: ['vehicleId'],
    _sum: { cost: true },
  });

  return vehicles.map((v) => {
    const totalRevenue = Number(tripRevenues.find((t) => t.vehicleId === v.id)?._sum.revenue || 0);
    const totalFuelCost = Number(fuelCosts.find((f) => f.vehicleId === v.id)?._sum.cost || 0);
    const totalMaintenanceCost = Number(maintenanceCosts.find((m) => m.vehicleId === v.id)?._sum.cost || 0);
    const totalCost = totalFuelCost + totalMaintenanceCost;

    const acqCost = Number(v.acquisitionCost || 0);
    let roi: number | null = null;
    let roiPercent: number | null = null;

    if (acqCost && acqCost > 0) {
      roi = parseFloat(((totalRevenue - totalCost) / acqCost).toFixed(3));
      roiPercent = parseFloat((roi * 100).toFixed(1));
    }

    return {
      vehicleId: v.id,
      regNumber: v.regNumber,
      name: v.name,
      totalRevenue,
      totalCost,
      acquisitionCost: acqCost,
      roi,
      roiPercent,
    };
  });
}
