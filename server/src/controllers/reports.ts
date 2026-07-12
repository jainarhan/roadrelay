import { Request, Response, NextFunction } from 'express';
import {
  getFuelEfficiencyReportService,
  getFleetUtilizationReportService,
  getOperationalCostReportService,
  getVehicleRoiReportService,
} from '../services/reports';

export async function getFuelEfficiencyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await getFuelEfficiencyReportService();
    return res.status(200).json({
      status: 'success',
      report,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFleetUtilizationReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await getFleetUtilizationReportService();
    return res.status(200).json({
      status: 'success',
      report,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOperationalCostReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await getOperationalCostReportService();
    return res.status(200).json({
      status: 'success',
      report,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVehicleRoiReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await getVehicleRoiReportService();
    return res.status(200).json({
      status: 'success',
      report,
    });
  } catch (error) {
    next(error);
  }
}
