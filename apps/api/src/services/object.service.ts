import { bucketRepository } from '../repositories/bucket.repository.js';
import { minioService } from '../lib/minio-client.js';
import { minio } from '../config/minio.js';
import { auditService } from './audit.service.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import { constants } from '@s3forge/config';
import type {
  PresignedUploadInput,
  PresignedDownloadInput,
  ListObjectsQueryInput,
} from '../validators/object.validators.js';

const ROOT_BUCKET = constants.STORAGE.ROOT_BUCKET_NAME || 's3forge-storage';

export class ObjectService {
  /**
   * Helper to build full object key prefix in MinIO.
   */
  private getFullObjectKey(minioBucketName: string, objectName: string): string {
    const cleanObject = objectName.startsWith('/') ? objectName.substring(1) : objectName;
    return `${minioBucketName}/${cleanObject}`;
  }

  /**
   * Generate a presigned PUT URL for direct client S3 upload.
   */
  async generatePresignedUploadUrl(
    bucketName: string,
    input: PresignedUploadInput,
    organizationId: number,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const fullKey = this.getFullObjectKey(bucket.minioBucketName, input.objectName);
    const expirySeconds = input.expirySeconds ?? constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS;
    const uploadUrl = await minioService.presignedPutObject(
      ROOT_BUCKET,
      fullKey,
      expirySeconds,
    );

    logger.debug(
      { bucketName, objectName: input.objectName, fullKey, expirySeconds },
      'Generated presigned upload URL',
    );

    auditService
      .recordAudit({
        organizationId,
        action: 'object.presigned_upload',
        resourceType: 'object',
        resourceId: input.objectName,
        metadata: { bucketName, objectName: input.objectName, expirySeconds },
      })
      .catch(() => {});

    return {
      uploadUrl,
      bucketName,
      objectName: input.objectName,
      expirySeconds,
      expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
    };
  }

  /**
   * Generate a presigned GET URL for temporary file downloads.
   */
  async generatePresignedDownloadUrl(
    bucketName: string,
    input: PresignedDownloadInput,
    organizationId: number,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const fullKey = this.getFullObjectKey(bucket.minioBucketName, input.objectName);
    const expirySeconds = input.expirySeconds ?? constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS;
    const downloadUrl = await minioService.presignedGetObject(
      ROOT_BUCKET,
      fullKey,
      expirySeconds,
    );

    logger.debug(
      { bucketName, objectName: input.objectName, fullKey, expirySeconds },
      'Generated presigned download URL',
    );

    auditService
      .recordAudit({
        organizationId,
        action: 'object.presigned_download',
        resourceType: 'object',
        resourceId: input.objectName,
        metadata: { bucketName, objectName: input.objectName, expirySeconds },
      })
      .catch(() => {});

    return {
      downloadUrl,
      bucketName,
      objectName: input.objectName,
      expirySeconds,
      expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
    };
  }

  /**
   * List objects within a bucket with optional prefix filtering.
   */
  async listObjects(
    bucketName: string,
    query: ListObjectsQueryInput,
    organizationId: number,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const userPrefix = query.prefix ?? '';
    const fullPrefix = `${bucket.minioBucketName}/${userPrefix}`;
    const recursive = query.recursive ?? true;
    const limit = query.limit ?? constants.PAGINATION.DEFAULT_OBJECT_LIMIT;

    const objectsList: Array<{
      name: string;
      size: number;
      etag: string;
      lastModified: Date | null;
    }> = [];

    try {
      const stream = minio.listObjectsV2(ROOT_BUCKET, fullPrefix, recursive);
      const prefixLength = `${bucket.minioBucketName}/`.length;

      for await (const item of stream) {
        if (item && item.name) {
          const relativeName = item.name.substring(prefixLength);
          objectsList.push({
            name: relativeName,
            size: item.size || 0,
            etag: item.etag || '',
            lastModified: item.lastModified || null,
          });

          if (objectsList.length >= limit) {
            break;
          }
        }
      }
    } catch (error: any) {
      logger.warn({ bucketName, err: error }, 'Failed to list objects in MinIO storage');
    }

    return {
      bucketName,
      prefix: userPrefix,
      totalCount: objectsList.length,
      objects: objectsList,
    };
  }

  /**
   * Retrieve metadata for a single object.
   */
  async getObjectMetadata(bucketName: string, objectName: string, organizationId: number) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const fullKey = this.getFullObjectKey(bucket.minioBucketName, objectName);
    const stat = await minioService.statObject(ROOT_BUCKET, fullKey);

    return {
      bucketName,
      objectName,
      size: stat.size,
      etag: stat.etag,
      contentType: stat.metaData['content-type'] || 'application/octet-stream',
      lastModified: stat.lastModified,
      metadata: stat.metaData,
    };
  }

  /**
   * Delete a single object from a bucket.
   */
  async deleteObject(bucketName: string, objectName: string, organizationId: number) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const fullKey = this.getFullObjectKey(bucket.minioBucketName, objectName);
    await minioService.removeObject(ROOT_BUCKET, fullKey);

    logger.info({ bucketName, objectName, fullKey }, 'Deleted object from storage bucket');

    auditService
      .recordAudit({
        organizationId,
        action: 'object.delete',
        resourceType: 'object',
        resourceId: objectName,
        metadata: { bucketName, objectName },
      })
      .catch(() => {});

    return true;
  }

  /**
   * Delete multiple objects in a single batch operation.
   */
  async batchDeleteObjects(
    bucketName: string,
    objectNames: string[],
    organizationId: number,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const fullKeys = objectNames.map((n) => this.getFullObjectKey(bucket.minioBucketName, n));
    await minioService.removeObjects(ROOT_BUCKET, fullKeys);

    logger.info(
      { bucketName, deletedCount: objectNames.length },
      'Batch deleted objects from storage bucket',
    );

    auditService
      .recordAudit({
        organizationId,
        action: 'object.batch_delete',
        resourceType: 'object',
        resourceId: `${objectNames.length} objects`,
        metadata: { bucketName, objectCount: objectNames.length, objectNames },
      })
      .catch(() => {});

    return {
      bucketName,
      deletedCount: objectNames.length,
      objectNames,
    };
  }
}

export const objectService = new ObjectService();
