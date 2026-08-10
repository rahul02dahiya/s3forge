import { minio } from '../config/minio.js';
import { logger } from './logger.js';
import { AppError } from './app-error.js';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5000;

/**
 * Checks if an error is a transient network error suitable for retry.
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.syscall;
  const status = error.statusCode || error.status;

  if (['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ENOTFOUND'].includes(code)) {
    return true;
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return false;
}

/**
 * Wraps a MinIO operation with exponential backoff and jitter retry resilience.
 */
export async function withMinioRetry<T>(
  operationName: string,
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt > maxRetries || !isRetryableError(error)) {
        logger.error({ err: error, operationName, attempt }, `MinIO operation '${operationName}' failed`);
        if (error instanceof AppError) throw error;
        throw AppError.internal(`MinIO storage operation failed: ${error.message || 'Unknown error'}`);
      }

      // Exponential backoff + 25% jitter
      const expDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = expDelay * (Math.random() * 0.25);
      const delay = Math.floor(expDelay + jitter);

      logger.warn(
        { err: error, operationName, attempt, maxRetries, retryDelayMs: delay },
        `MinIO operation '${operationName}' transient error, retrying in ${delay}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw AppError.internal(`MinIO operation '${operationName}' failed after maximum retries`);
}

/**
 * Resilient MinIO client wrappers
 */
export const minioService = {
  async bucketExists(bucketName: string): Promise<boolean> {
    return withMinioRetry('bucketExists', () => minio.bucketExists(bucketName));
  },

  async makeBucket(bucketName: string, region: string = 'us-east-1'): Promise<void> {
    return withMinioRetry('makeBucket', () => minio.makeBucket(bucketName, region));
  },

  async removeBucket(bucketName: string): Promise<void> {
    return withMinioRetry('removeBucket', () => minio.removeBucket(bucketName));
  },

  async listBuckets(): Promise<Array<{ name: string; creationDate: Date }>> {
    return withMinioRetry('listBuckets', () => minio.listBuckets());
  },

  async presignedPutObject(bucketName: string, objectName: string, expirySeconds: number = 3600): Promise<string> {
    return withMinioRetry('presignedPutObject', () => minio.presignedPutObject(bucketName, objectName, expirySeconds));
  },

  async presignedGetObject(bucketName: string, objectName: string, expirySeconds: number = 3600): Promise<string> {
    return withMinioRetry('presignedGetObject', () => minio.presignedGetObject(bucketName, objectName, expirySeconds));
  },

  async statObject(bucketName: string, objectName: string) {
    return withMinioRetry('statObject', () => minio.statObject(bucketName, objectName));
  },

  async getObject(bucketName: string, objectName: string) {
    return withMinioRetry('getObject', () => minio.getObject(bucketName, objectName));
  },

  async removeObject(bucketName: string, objectName: string): Promise<void> {
    return withMinioRetry('removeObject', () => minio.removeObject(bucketName, objectName));
  },

  async removeObjects(bucketName: string, objectNames: string[]): Promise<void> {
    return withMinioRetry('removeObjects', async () => {
      await minio.removeObjects(bucketName, objectNames);
    });
  },
};
