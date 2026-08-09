import { bucketRepository, type BucketRecord } from '../repositories/bucket.repository.js';
import { minioService } from '../lib/minio-client.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import type { CreateBucketInput } from '../validators/storage.validators.js';

// Default organization ID for early phases before full multi-tenant auth is active
const DEFAULT_ORGANIZATION_ID = 1;
const DEFAULT_ORG_PREFIX = 'org1';

export class StorageService {
  /**
   * Constructs internal unique MinIO bucket name with organization prefix.
   */
  private buildMinioBucketName(name: string): string {
    return `${DEFAULT_ORG_PREFIX}-${name}`;
  }

  /**
   * Create a new bucket both in MinIO storage and PostgreSQL metadata.
   */
  async createBucket(input: CreateBucketInput): Promise<BucketRecord> {
    const { name, region = 'us-east-1', visibility = 'private', quotaBytes = 0 } = input;

    // 1. Check if active bucket record exists in PostgreSQL
    const existingDbRecord = await bucketRepository.findByName(DEFAULT_ORGANIZATION_ID, name);
    if (existingDbRecord) {
      throw AppError.conflict(`Bucket with name '${name}' already exists`);
    }

    const minioBucketName = this.buildMinioBucketName(name);

    // 2. Check if bucket exists directly in MinIO
    const minioExists = await minioService.bucketExists(minioBucketName);
    if (minioExists) {
      throw AppError.conflict(`Storage container '${minioBucketName}' already exists in MinIO engine`);
    }

    // 3. Create bucket in MinIO
    await minioService.makeBucket(minioBucketName, region);

    // 4. Persist metadata in PostgreSQL with compensation rollback on DB failure
    try {
      const createdRecord = await bucketRepository.create({
        organizationId: DEFAULT_ORGANIZATION_ID,
        name,
        minioBucketName,
        region,
        visibility,
        quotaBytes,
      });

      logger.info(
        { bucketId: createdRecord.id, name, minioBucketName, region },
        `Successfully created bucket '${name}'`,
      );

      return createdRecord;
    } catch (dbError) {
      // Compensation: remove orphan MinIO bucket if DB record creation failed
      logger.error(
        { err: dbError, minioBucketName },
        `PostgreSQL insert failed for bucket '${name}'. Rolling back MinIO bucket creation.`,
      );
      try {
        await minioService.removeBucket(minioBucketName);
      } catch (rollbackError) {
        logger.fatal(
          { err: rollbackError, minioBucketName },
          `Compensation rollback failed to delete orphan MinIO bucket '${minioBucketName}'`,
        );
      }
      throw dbError;
    }
  }

  /**
   * List paginated active buckets.
   */
  async listBuckets(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: BucketRecord[]; meta: { page: number; limit: number; total: number } }> {
    const offset = (page - 1) * limit;

    const { data, total } = await bucketRepository.findPaginated(
      DEFAULT_ORGANIZATION_ID,
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
   * Retrieve single bucket by name.
   */
  async getBucketByName(name: string): Promise<BucketRecord> {
    const bucket = await bucketRepository.findByName(DEFAULT_ORGANIZATION_ID, name);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${name}' not found`);
    }
    return bucket;
  }

  /**
   * Soft-delete a bucket by user name.
   */
  async deleteBucketByName(name: string): Promise<void> {
    const bucket = await this.getBucketByName(name);

    await bucketRepository.softDelete(bucket.id);

    logger.info({ bucketId: bucket.id, name }, `Soft-deleted bucket '${name}'`);
  }
}

export const storageService = new StorageService();
