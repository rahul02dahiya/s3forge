import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/app-error.js';
import { sendError } from '../lib/response.js';
import { logger } from '../lib/logger.js';

/**
 * Global error handler middleware.
 * Catches all errors thrown by routes/controllers/services and returns
 * a consistent JSON error response.
 *
 * Must be registered LAST in the middleware chain (after all routes).
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.id }, err.message);
    } else {
      logger.warn({ requestId: req.id, code: err.code }, err.message);
    }

    sendError(res, err.message, err.statusCode, err.code, err.errors);
    return;
  }

  // Handle unexpected errors — log full stack, return generic message
  logger.error({ err, requestId: req.id }, 'Unhandled error');

  sendError(
    res,
    'An unexpected error occurred',
    500,
    'INTERNAL_ERROR',
  );
}
