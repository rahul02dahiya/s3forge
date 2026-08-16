import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/app-error.js';

/**
 * Middleware enforcing role-based access control (RBAC).
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    const userRole = req.user.role || 'member';
    if (!allowedRoles.includes(userRole)) {
      return next(
        AppError.forbidden(
          `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`,
        ),
      );
    }

    next();
  };
}
