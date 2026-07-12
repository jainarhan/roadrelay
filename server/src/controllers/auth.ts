import { Request, Response, NextFunction } from 'express';
import { loginService } from '../services/auth';
import { UnauthorizedError } from '../utils/errors';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await loginService(req.body);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      status: 'success',
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export function logout(req: Request, res: Response, next: NextFunction) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
}

export function me(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError('Not authenticated'));
  }

  return res.status(200).json({
    status: 'success',
    user: req.user,
  });
}
