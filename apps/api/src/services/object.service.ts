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

export class ObjectService {
  /**
   * Generate a presigned PUT URL for direct client S3 upload.
   */
  async generatePresignedUploadUrl(
    bucketName: string,
    input: PresignedUploadInput,
    organizationId: number = 1,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const expirySeconds = input.expirySeconds ?? constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS;
    const uploadUrl = await minioService.presignedPutObject(
      bucket.minioBucketName,
      input.objectName,
      expirySeconds,
    );

    logger.debug(
      { bucketName, objectName: input.objectName, expirySeconds },
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
    organizationId: number = 1,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const expirySeconds = input.expirySeconds ?? constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS;
    const downloadUrl = await minioService.presignedGetObject(
      bucket.minioBucketName,
      input.objectName,
      expirySeconds,
    );

    logger.debug(
      { bucketName, objectName: input.objectName, expirySeconds },
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
    organizationId: number = 1,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const prefix = query.prefix ?? '';
    const recursive = query.recursive ?? true;
    const limit = query.limit ?? constants.PAGINATION.DEFAULT_OBJECT_LIMIT;

    const objectsList: Array<{
      name: string;
      size: number;
      etag: string;
      lastModified: Date | null;
    }> = [];

    try {
      const stream = minio.listObjectsV2(bucket.minioBucketName, prefix, recursive);
      for await (const item of stream) {
        if (item && item.name) {
          objectsList.push({
            name: item.name,
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
      logger.warn({ bucketName, err: error }, 'Failed to list objects in MinIO container');
    }

    return {
      bucketName,
      prefix,
      totalCount: objectsList.length,
      objects: objectsList,
    };
  }

  /**
   * Retrieve metadata for a single object.
   */
  async getObjectMetadata(bucketName: string, objectName: string, organizationId: number = 1) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const stat = await minioService.statObject(bucket.minioBucketName, objectName);
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
  async deleteObject(bucketName: string, objectName: string, organizationId: number = 1) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    await minioService.removeObject(bucket.minioBucketName, objectName);

    logger.info({ bucketName, objectName }, 'Deleted object from storage bucket');

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
    organizationId: number = 1,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    await minioService.removeObjects(bucket.minioBucketName, objectNames);

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
