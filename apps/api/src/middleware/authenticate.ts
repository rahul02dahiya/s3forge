import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../lib/jwt.js';
import { s3CredentialRepository } from '../repositories/s3-credential.repository.js';
import { verifySecretKey } from '../lib/credential-generator.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';

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

      // 2. Check S3Forge custom key headers for JSON API access.
      if (options.allowAccessKey !== false) {
        const accessKeyHeader = (req.headers['x-s3forge-access-key'] || req.headers['x-access-key']) as string | undefined;
        const secretKeyHeader = req.headers['x-s3forge-secret-key'] as string | undefined;
        if (accessKeyHeader) {
          const accessKey = accessKeyHeader.trim();
          const credential = await s3CredentialRepository.findByAccessKey(accessKey);
          if (
            credential &&
            credential.isActive &&
            secretKeyHeader &&
            verifySecretKey(secretKeyHeader.trim(), credential.secretKeyHash)
          ) {
            req.organizationId = credential.organizationId;
            s3CredentialRepository.updateLastUsed(credential.accessKey).catch((err) => {
              logger.warn({ err, accessKey: credential.accessKey }, 'Failed to update credential lastUsed timestamp');
            });
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
