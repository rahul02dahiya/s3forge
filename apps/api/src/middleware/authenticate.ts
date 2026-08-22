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

      // 2. Check S3 Access Key in header or AWS SigV4 Authorization header / query param
      if (options.allowAccessKey !== false) {
        let accessKey: string | undefined;

        // 2a. Check X-S3Forge-Access-Key or X-Access-Key header
        const accessKeyHeader = (req.headers['x-s3forge-access-key'] || req.headers['x-access-key']) as string | undefined;
        if (accessKeyHeader) {
          accessKey = accessKeyHeader.trim();
        }

        // 2b. Check AWS SigV4 Authorization header (e.g. AWS4-HMAC-SHA256 Credential=ACCESS_KEY/...)
        if (!accessKey && authHeader && authHeader.startsWith('AWS4-HMAC-SHA256 ')) {
          const match = authHeader.match(/Credential=([^/\s,]+)/);
          if (match && match[1]) {
            accessKey = match[1].trim();
          }
        }

        // 2c. Check AWS SigV4 query parameter (X-Amz-Credential)
        if (!accessKey) {
          const amzCred = (req.query['X-Amz-Credential'] || req.query['x-amz-credential']) as string | undefined;
          if (amzCred) {
            const parts = amzCred.split('/');
            if (parts[0]) {
              accessKey = parts[0].trim();
            }
          }
        }

        if (accessKey) {
          const credential = await s3CredentialRepository.findByAccessKey(accessKey);
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
