import { Request, Response, NextFunction } from 'express';
import { createExpenseService, getExpensesService } from '../services/expense';

export async function createExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await createExpenseService(req.body);
    return res.status(201).json({
      status: 'success',
      expense,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = req.query.vehicleId as string | undefined;
    const expenses = await getExpensesService({ vehicleId });
    return res.status(200).json({
      status: 'success',
      expenses,
    });
  } catch (error) {
    next(error);
  }
}
