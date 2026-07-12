import { Request, Response, NextFunction } from 'express';
import {
  createDriverService,
  getDriversService,
  updateDriverService,
} from '../services/driver';

export async function createDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const driver = await createDriverService(req.body);
    return res.status(201).json({
      status: 'success',
      driver,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const dispatchable = req.query.dispatchable === 'true';
    const drivers = await getDriversService({ dispatchable });
    return res.status(200).json({
      status: 'success',
      drivers,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const driver = await updateDriverService(id, req.body);
    return res.status(200).json({
      status: 'success',
      driver,
    });
  } catch (error) {
    next(error);
  }
}
