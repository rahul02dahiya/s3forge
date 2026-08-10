import type { Request, Response } from 'express';
import { sendError } from '../lib/response.js';

/**
 * Catch-all middleware for unmatched routes.
 * Must be registered AFTER all route handlers but BEFORE the error handler.
 */
export function notFound(req: Request, res: Response): void {
  sendError(
    res,
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND',
  );
}
