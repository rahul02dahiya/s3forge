import { bucketRepository } from '../repositories/bucket.repository.js';
import { usageSnapshotRepository } from '../repositories/usage-snapshot.repository.js';
import { minio } from '../config/minio.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import { constants } from '@s3forge/config';

const ROOT_BUCKET = constants.STORAGE.ROOT_BUCKET_NAME || 's3forge-storage';

export class UsageService {
  /**
   * Recalculate usage statistics for a bucket by scanning object metadata in MinIO.
   */
  async recalculateBucketUsage(bucketName: string, organizationId: number) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    let objectCount = 0;
    let totalBytes = 0;

    try {
      const prefix = `${bucket.minioBucketName}/`;
      const stream = minio.listObjectsV2(ROOT_BUCKET, prefix, true);
      for await (const obj of stream) {
        if (obj && obj.size !== undefined) {
          objectCount += 1;
          totalBytes += obj.size;
        }
      }
    } catch (error) {
      logger.warn({ bucketName, err: error }, 'MinIO scan for usage recalculation failed or bucket empty');
    }

    const snapshot = await usageSnapshotRepository.createSnapshot({
      bucketId: bucket.id,
      objectCount,
      totalBytes,
    });

    logger.debug(
      { bucketName, objectCount, totalBytes },
      'Recalculating bucket storage usage snapshot complete',
    );

    return {
      bucketName: bucket.name,
      minioBucketName: bucket.minioBucketName,
      objectCount: snapshot.objectCount,
      totalBytes: snapshot.totalBytes,
      calculatedAt: snapshot.calculatedAt,
    };
  }

  /**
   * Get usage metrics and snapshot history for a specific bucket.
   */
  async getBucketUsage(
    bucketName: string,
    organizationId: number,
    page: number = 1,
    limit: number = 30,
  ) {
    const bucket = await bucketRepository.findByName(organizationId, bucketName);
    if (!bucket) {
      throw AppError.notFound(`Bucket '${bucketName}' not found`);
    }

    const { data: history, total, totalPages } =
      await usageSnapshotRepository.getSnapshotHistoryPaginated(bucket.id, page, limit);

    const latest = history[0] ?? (await usageSnapshotRepository.getLatestSnapshot(bucket.id));

    return {
      bucket: {
        id: bucket.id,
        name: bucket.name,
        minioBucketName: bucket.minioBucketName,
        region: bucket.region,
      },
      currentUsage: latest
        ? {
            objectCount: latest.objectCount,
            totalBytes: latest.totalBytes,
            calculatedAt: latest.calculatedAt,
          }
        : {
            objectCount: 0,
            totalBytes: 0,
            calculatedAt: null,
          },
      history: history.map((h) => ({
        objectCount: h.objectCount,
        totalBytes: h.totalBytes,
        calculatedAt: h.calculatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get aggregated organization-wide storage usage metrics across all buckets.
   */
  async getOrganizationUsage(organizationId: number) {
    const buckets = await bucketRepository.findAllByOrganization(organizationId);
    const bucketIds = buckets.map((b) => b.id);

    const snapshots = await usageSnapshotRepository.getLatestSnapshotsForBuckets(bucketIds);

    // Map latest snapshot per bucket
    const latestPerBucket = new Map<number, { objectCount: number; totalBytes: number }>();
    for (const s of snapshots) {
      if (!latestPerBucket.has(s.bucketId)) {
        latestPerBucket.set(s.bucketId, {
          objectCount: s.objectCount,
          totalBytes: s.totalBytes,
        });
      }
    }

    let totalBuckets = buckets.length;
    let totalObjects = 0;
    let totalStorageBytes = 0;

    for (const b of buckets) {
      const usage = latestPerBucket.get(b.id);
      if (usage) {
        totalObjects += usage.objectCount;
        totalStorageBytes += usage.totalBytes;
      }
    }

    return {
      organizationId,
      totalBuckets,
      totalObjects,
      totalStorageBytes,
      bucketsUsage: buckets.map((b) => {
        const u = latestPerBucket.get(b.id);
        return {
          id: b.id,
          name: b.name,
          objectCount: u?.objectCount ?? 0,
          totalBytes: u?.totalBytes ?? 0,
        };
      }),
    };
  }
}

export const usageService = new UsageService();
