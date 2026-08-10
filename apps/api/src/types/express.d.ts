import type { Logger } from 'pino';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  organizationId: number;
}

declare global {
  namespace Express {
    interface Request {
      /** Unique correlation ID for this request (UUID v4) */
      id: string;
      /** Pino child logger with request context */
      log: Logger;
      /** Authenticated user details (if authenticated) */
      user?: AuthenticatedUser;
      /** Organization ID associated with the current request */
      organizationId?: number;
    }
  }
}
