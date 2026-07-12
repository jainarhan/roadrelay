import { Request, Response, NextFunction } from 'express';
import { createFuelLogService, getFuelLogsService } from '../services/fuel';

export async function createFuelLog(req: Request, res: Response, next: NextFunction) {
  try {
    const fuelLog = await createFuelLogService(req.body);
    return res.status(201).json({
      status: 'success',
      fuelLog,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFuelLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = req.query.vehicleId as string | undefined;
    const fuelLogs = await getFuelLogsService({ vehicleId });
    return res.status(200).json({
      status: 'success',
      fuelLogs,
    });
  } catch (error) {
    next(error);
  }
}
