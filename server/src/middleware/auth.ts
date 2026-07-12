import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  if (!token) {
    return next(new UnauthorizedError('Authentication token is missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: Role;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}
