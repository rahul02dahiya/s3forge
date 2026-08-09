import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      /** Unique correlation ID for this request (UUID v4) */
      id: string;
      /** Pino child logger with request context */
      log: Logger;
    }
  }
}
