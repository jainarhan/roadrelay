import { Request, Response, NextFunction } from 'express';
import {
  createVehicleService,
  getVehiclesService,
  updateVehicleService,
} from '../services/vehicle';

export async function createVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicle = await createVehicleService(req.body);
    return res.status(201).json({
      status: 'success',
      vehicle,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const dispatchable = req.query.dispatchable === 'true';
    const vehicles = await getVehiclesService({ dispatchable });
    return res.status(200).json({
      status: 'success',
      vehicles,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const vehicle = await updateVehicleService(id, req.body);
    return res.status(200).json({
      status: 'success',
      vehicle,
    });
  } catch (error) {
    next(error);
  }
}
