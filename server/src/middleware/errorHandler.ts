import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Error Handler]:', err);

  if (err instanceof AppError) {
    const responseBody: any = {
      status: 'error',
      message: err.message,
    };
    if (err instanceof ValidationError && err.errors) {
      responseBody.errors = err.errors;
    }
    return res.status(err.statusCode).json(responseBody);
  }

  // Fallback for unhandled/internal server errors
  return res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
}
