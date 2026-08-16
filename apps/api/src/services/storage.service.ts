import { bucketRepository, type BucketRecord } from '../repositories/bucket.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { minioService } from '../lib/minio-client.js';
import { minio } from '../config/minio.js';
import { auditService } from './audit.service.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import { constants } from '@s3forge/config';
import type { CreateBucketInput } from '../validators/storage.validators.js';

export const ROOT_BUCKET = constants.STORAGE.ROOT_BUCKET_NAME || 's3forge-storage';

export class StorageService {
  /**
   * Ensure root storage bucket exists in MinIO.
   */
  async ensureRootBucket(): Promise<void> {
    try {
      const exists = await minioService.bucketExists(ROOT_BUCKET);
      if (!exists) {
        await minioService.makeBucket(ROOT_BUCKET, constants.STORAGE.DEFAULT_REGION || 'us-east-1');
        logger.info({ bucket: ROOT_BUCKET }, `Created root MinIO bucket '${ROOT_BUCKET}'`);
      }
    } catch (err) {
      logger.error({ err, bucket: ROOT_BUCKET }, `Failed to initialize root MinIO bucket '${ROOT_BUCKET}'`);
    }
  }

  /**
   * Constructs internal unique MinIO object prefix path: <org-slug>/u<userId>/<bucketName>
   */
  private buildMinioPrefix(orgSlug: string, userId: number, bucketName: string): string {
    return `${orgSlug}/u${userId}/${bucketName}`;
  }

  /**
   * Create a new bucket virtual container in MinIO folder hierarchy and PostgreSQL metadata.
   */
  async createBucket(
    input: CreateBucketInput,
    organizationId: number,
    userId: number,
  ): Promise<BucketRecord> {
    const { name, region = 'us-east-1', visibility = 'private', quotaBytes = 0 } = input;

    // 1. Check if active bucket record exists in PostgreSQL
    const existingDbRecord = await bucketRepository.findByName(organizationId, name);
    if (existingDbRecord) {
      throw AppError.conflict(`Bucket with name '${name}' already exists in your organization`);
    }

    // 2. Fetch Organization slug
    const org = await userRepository.getOrganizationById(organizationId);
    const orgSlug = org?.slug ?? `org${organizationId}`;

    const minioBucketPrefix = this.buildMinioPrefix(orgSlug, userId, name);

    // 3. Ensure root MinIO storage bucket exists
    await this.ensureRootBucket();

    // 4. Persist metadata in PostgreSQL
    const createdRecord = await bucketRepository.create({
      organizationId,
      createdBy: userId,
      name,
      minioBucketName: minioBucketPrefix,
      region,
      visibility,
      quotaBytes,
    });

    logger.info(
      { bucketId: createdRecord.id, name, minioBucketName: minioBucketPrefix, organizationId, userId },
      `Successfully created bucket '${name}' under prefix '${minioBucketPrefix}'`,
    );

    // Record Audit Event
    auditService
      .recordAudit({
        organizationId,
        userId,
        action: 'bucket.create',
        resourceType: 'bucket',
        resourceId: String(createdRecord.id),
        metadata: { name, minioBucketName: minioBucketPrefix, region, visibility },
      })
      .catch(() => {});

    return createdRecord;
  }

  /**
   * List paginated active buckets for an organization.
   */
  async listBuckets(
    page: number = 1,
    limit: number = 20,
    organizationId: number = 1,
  ): Promise<{ data: BucketRecord[]; meta: { page: number; limit: number; total: number } }> {
    const offset = (page - 1) * limit;

    const { data, total } = await bucketRepository.findPaginated(
      organizationId,
      limit,
      offset,
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Retrieve single bucket by name within organization.
   */
  async getBucketByName(name: string, organizationId: number): Promise<BucketRecord> {
    const bucket = await bucketRepository.findByName(organizationId, name);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${name}' not found`);
    }
    return bucket;
  }

  /**
   * Soft-delete a bucket by user name and cleanup MinIO objects under its prefix.
   */
  async deleteBucketByName(name: string, organizationId: number, userId?: number): Promise<void> {
    const bucket = await this.getBucketByName(name, organizationId);

    // Asynchronously delete objects under minioBucketName prefix from MinIO
    const prefix = `${bucket.minioBucketName}/`;
    try {
      const objectsList: string[] = [];
      const stream = minio.listObjectsV2(ROOT_BUCKET, prefix, true);
      for await (const obj of stream) {
        if (obj && obj.name) {
          objectsList.push(obj.name);
        }
      }
      if (objectsList.length > 0) {
        await minio.removeObjects(ROOT_BUCKET, objectsList);
      }
    } catch (err) {
      logger.warn({ err, prefix }, `MinIO prefix cleanup during bucket deletion encountered warning`);
    }

    await bucketRepository.softDelete(bucket.id);

    logger.info({ bucketId: bucket.id, name, organizationId }, `Soft-deleted bucket '${name}'`);

    // Record Audit Event
    auditService
      .recordAudit({
        organizationId,
        userId,
        action: 'bucket.delete',
        resourceType: 'bucket',
        resourceId: String(bucket.id),
        metadata: { name, minioBucketName: bucket.minioBucketName },
      })
      .catch(() => {});
  }
}

export const storageService = new StorageService();
