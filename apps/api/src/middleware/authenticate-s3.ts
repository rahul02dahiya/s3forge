import type { Request, Response, NextFunction } from 'express';
import { s3CredentialRepository } from '../repositories/s3-credential.repository.js';
import { decryptSecretKey } from '../lib/credential-crypto.js';
import { getSigV4AccessKey, verifySigV4Request } from '../lib/sigv4.js';
import { s3Errors } from '../lib/s3-errors.js';
import { logger } from '../lib/logger.js';

export function authenticateS3() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const accessKey = getSigV4AccessKey(req);
      const credential = await s3CredentialRepository.findByAccessKey(accessKey);
      if (!credential || !credential.isActive || !credential.secretKeyEncrypted) {
        throw s3Errors.invalidAccessKeyId();
      }

      await verifySigV4Request(req, decryptSecretKey(credential.secretKeyEncrypted));
      req.organizationId = credential.organizationId;
      req.s3AccessKey = credential.accessKey;

      s3CredentialRepository.updateLastUsed(credential.accessKey).catch((err) => {
        logger.warn({ err, accessKey: credential.accessKey }, 'Failed to update S3 credential lastUsed timestamp');
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}
