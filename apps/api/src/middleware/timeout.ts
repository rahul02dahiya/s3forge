import type { Request, Response, NextFunction } from 'express';
import { constants } from '@s3forge/config';

/**
 * Enforces a maximum duration for HTTP request processing.
 * Prevents hanging long operations from consuming socket connections indefinitely.
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  const timeoutMs = constants.SERVER.REQUEST_TIMEOUT_MS || 30_000;

  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: `Request timed out after ${timeoutMs}ms`,
        },
      });
    }
  });

  next();
}
