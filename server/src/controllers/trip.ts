import { Request, Response, NextFunction } from 'express';
import {
  createTripService,
  getTripsService,
  dispatchTripService,
  completeTripService,
  cancelTripService,
} from '../services/trip';

export async function createTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const trip = await createTripService(req.body);
    return res.status(201).json({
      status: 'success',
      trip,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTrips(req: Request, res: Response, next: NextFunction) {
  try {
    const trips = await getTripsService();
    return res.status(200).json({
      status: 'success',
      trips,
    });
  } catch (error) {
    next(error);
  }
}

export async function dispatchTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const trip = await dispatchTripService(id);
    return res.status(200).json({
      status: 'success',
      trip,
    });
  } catch (error) {
    next(error);
  }
}

export async function completeTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const trip = await completeTripService(id, req.body);
    return res.status(200).json({
      status: 'success',
      trip,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelTrip(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const trip = await cancelTripService(id);
    return res.status(200).json({
      status: 'success',
      trip,
    });
  } catch (error) {
    next(error);
  }
}
