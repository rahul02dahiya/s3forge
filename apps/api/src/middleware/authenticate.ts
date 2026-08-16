import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt.js';
import { s3CredentialRepository } from '../repositories/s3-credential.repository.js';
import { AppError } from '../lib/app-error.js';

export interface AuthenticateOptions {
  optional?: boolean;
  allowAccessKey?: boolean;
}

/**
 * Middleware enforcing JWT Bearer token or S3 Access Key authentication.
 */
export function authenticate(options: AuthenticateOptions = {}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Check Bearer Token in Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        const payload = verifyJwt(token);

        if (payload) {
          req.user = {
            userId: payload.userId,
            email: payload.email,
            organizationId: payload.organizationId,
            role: payload.role,
          };
          req.organizationId = payload.organizationId;
          return next();
        }
      }

      // 2. Check S3 Access Key in header (e.g. X-S3Forge-Access-Key or X-Access-Key)
      if (options.allowAccessKey !== false) {
        const accessKeyHeader = (req.headers['x-s3forge-access-key'] || req.headers['x-access-key']) as string | undefined;
        if (accessKeyHeader) {
          const credential = await s3CredentialRepository.findByAccessKey(accessKeyHeader.trim());
          if (credential && credential.isActive) {
            req.organizationId = credential.organizationId;
            // Touch last used timestamp asynchronously
            s3CredentialRepository.updateLastUsed(credential.accessKey).catch(() => {});
            return next();
          }
        }
      }

      // 3. Fallback for optional auth vs mandatory auth
      if (options.optional) {
        return next();
      }

      throw AppError.unauthorized('Authentication required. Provide a valid Bearer token or S3 Access Key.');
    } catch (error) {
      next(error);
    }
  };
}
