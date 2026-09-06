import type { Request } from 'express';
import { bucketRepository, type BucketRecord } from '../repositories/bucket.repository.js';
import { minioService } from '../lib/minio-client.js';
import { minio } from '../config/minio.js';
import { constants } from '@s3forge/config';
import { s3Errors } from '../lib/s3-errors.js';
import type { S3ObjectListItem } from '../lib/s3-xml.js';
import { auditService } from './audit.service.js';
import { usageService } from './usage.service.js';
import { logger } from '../lib/logger.js';

const ROOT_BUCKET = constants.STORAGE.ROOT_BUCKET_NAME || 's3forge-storage';

export class S3GatewayService {
  async listBuckets(organizationId: number): Promise<BucketRecord[]> {
    return bucketRepository.findAllByOrganization(organizationId);
  }

  async getBucket(organizationId: number, bucketName: string): Promise<BucketRecord> {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw s3Errors.noSuchBucket();
    }
    return bucket;
  }

  private buildInternalObjectKey(minioBucketName: string, objectKey: string): string {
    const cleanKey = decodeURIComponent(objectKey).replace(/^\/+/, '');
    if (!cleanKey || cleanKey.split('/').includes('..')) {
      throw s3Errors.invalidArgument('Invalid object key');
    }

    // minioBucketName is an internal tenant prefix inside ROOT_BUCKET, not a user-visible S3 bucket.
    return `${minioBucketName}/${cleanKey}`;
  }

  async listObjects(params: {
    organizationId: number;
    bucketName: string;
    prefix?: string;
    maxKeys?: number;
  }): Promise<S3ObjectListItem[]> {
    const bucket = await this.getBucket(params.organizationId, params.bucketName);
    const userPrefix = params.prefix ? decodeURIComponent(params.prefix).replace(/^\/+/, '') : '';
    const internalPrefix = `${bucket.minioBucketName}/${userPrefix}`;
    const prefixLength = `${bucket.minioBucketName}/`.length;
    const maxKeys = Math.min(
      Math.max(params.maxKeys ?? constants.PAGINATION.DEFAULT_OBJECT_LIMIT, 1),
      constants.PAGINATION.MAX_OBJECT_LIMIT,
    );
    const objects: S3ObjectListItem[] = [];

    const stream = minio.listObjectsV2(ROOT_BUCKET, internalPrefix, true);
    for await (const item of stream) {
      if (!item.name) continue;
      objects.push({
        key: item.name.substring(prefixLength),
        lastModified: item.lastModified ?? null,
        etag: item.etag ?? '',
        size: item.size ?? 0,
      });

      if (objects.length >= maxKeys) break;
    }

    return objects;
  }

  async putObject(params: {
    organizationId: number;
    bucketName: string;
    objectKey: string;
    req: Request;
  }) {
    const bucket = await this.getBucket(params.organizationId, params.bucketName);
    const internalKey = this.buildInternalObjectKey(bucket.minioBucketName, params.objectKey);
    const contentLength = params.req.headers['content-length'];
    const size = typeof contentLength === 'string' ? Number(contentLength) : undefined;
    const contentType = params.req.headers['content-type'];
    const metaData = typeof contentType === 'string' ? { 'Content-Type': contentType } : undefined;

    const result = await minioService.putObject(
      ROOT_BUCKET,
      internalKey,
      params.req,
      Number.isFinite(size) ? size : undefined,
      metaData,
    );

    auditService.recordAudit({
      organizationId: params.organizationId,
      action: 'object.put',
      resourceType: 'object',
      resourceId: params.objectKey,
      metadata: { bucketName: params.bucketName, objectName: params.objectKey },
    }).catch((err) => logger.warn({ err }, 'Failed to record audit log'));

    // Fire-and-forget: trigger an async usage recalculation so UI reflects new object counts
    // We intentionally don't await this to avoid slowing down the upload response.
    usageService.recalculateBucketUsage(bucket.name, params.organizationId).catch((err) => {
      logger.warn({ err, bucket: bucket.name }, 'Failed to recalculate usage after object.put');
    });

    return result;
  }

  async getObject(organizationId: number, bucketName: string, objectKey: string) {
    const bucket = await this.getBucket(organizationId, bucketName);
    const internalKey = this.buildInternalObjectKey(bucket.minioBucketName, objectKey);

    try {
      const [stat, stream] = await Promise.all([
        minioService.statObject(ROOT_BUCKET, internalKey),
        minioService.getObject(ROOT_BUCKET, internalKey),
      ]);
      return { stat, stream };
    } catch {
      throw s3Errors.noSuchKey();
    }
  }

  async headObject(organizationId: number, bucketName: string, objectKey: string) {
    const bucket = await this.getBucket(organizationId, bucketName);
    const internalKey = this.buildInternalObjectKey(bucket.minioBucketName, objectKey);

    try {
      return await minioService.statObject(ROOT_BUCKET, internalKey);
    } catch {
      throw s3Errors.noSuchKey();
    }
  }

  async deleteObject(organizationId: number, bucketName: string, objectKey: string): Promise<void> {
    const bucket = await this.getBucket(organizationId, bucketName);
    const internalKey = this.buildInternalObjectKey(bucket.minioBucketName, objectKey);
    await minioService.removeObject(ROOT_BUCKET, internalKey);

    auditService.recordAudit({
      organizationId,
      action: 'object.delete',
      resourceType: 'object',
      resourceId: objectKey,
      metadata: { bucketName, objectName: objectKey },
    }).catch((err) => logger.warn({ err }, 'Failed to record audit log'));

    // Fire-and-forget: trigger an async usage recalculation so UI reflects deletion
    usageService.recalculateBucketUsage(bucket.name, organizationId).catch((err) => {
      logger.warn({ err, bucket: bucket.name }, 'Failed to recalculate usage after object.delete');
    });
  }
}

export const s3GatewayService = new S3GatewayService();
