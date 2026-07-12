import { Request, Response, NextFunction } from 'express';
import {
  createMaintenanceLogService,
  getMaintenanceLogsService,
  closeMaintenanceLogService,
} from '../services/maintenance';

export async function createMaintenanceLog(req: Request, res: Response, next: NextFunction) {
  try {
    const log = await createMaintenanceLogService(req.body);
    return res.status(201).json({
      status: 'success',
      log,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMaintenanceLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = req.query.vehicleId as string | undefined;
    const logs = await getMaintenanceLogsService({ vehicleId });
    return res.status(200).json({
      status: 'success',
      logs,
    });
  } catch (error) {
    next(error);
  }
}

export async function closeMaintenanceLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const log = await closeMaintenanceLogService(id);
    return res.status(200).json({
      status: 'success',
      log,
    });
  } catch (error) {
    next(error);
  }
}
