import { Request, Response, NextFunction } from 'express';
import { getDashboardSummaryService } from '../services/dashboard';

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await getDashboardSummaryService();
    return res.status(200).json({
      status: 'success',
      summary,
    });
  } catch (error) {
    next(error);
  }
}
