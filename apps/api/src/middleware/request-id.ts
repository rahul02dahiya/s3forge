import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Assigns a unique correlation ID to each request.
 * Uses the incoming X-Request-Id header if present, otherwise generates a UUID v4.
 * The ID is attached to both the request object and the response header.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();

  req.id = id;
  res.setHeader('X-Request-Id', id);

  next();
}
