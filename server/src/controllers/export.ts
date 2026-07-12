import { Request, Response, NextFunction } from 'express';
import {
  exportVehiclesCSV,
  exportDriversCSV,
  exportTripsCSV,
  exportMaintenanceLogsCSV,
  exportFuelLogsCSV,
  exportExpensesCSV,
} from '../services/export';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export async function exportVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportVehiclesCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vehicles-export-${getTodayString()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportDriversCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="drivers-export-${getTodayString()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportTrips(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportTripsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="trips-export-${getTodayString()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportMaintenanceLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportMaintenanceLogsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="maintenance-export-${getTodayString()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportFuelLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportFuelLogsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fuel-export-${getTodayString()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

export async function exportExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportExpensesCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-export-${getTodayString()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}
