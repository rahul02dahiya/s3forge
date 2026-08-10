import { db } from '../config/database.js';
import { buckets } from '@s3forge/database';
import { eq } from 'drizzle-orm';
import { usageService } from '../services/usage.service.js';
import { logger } from '../lib/logger.js';
import { constants } from '@s3forge/config';

export class SnapshotWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private intervalMs: number;

  constructor(intervalMs: number = constants.WORKER.SNAPSHOT_INTERVAL_MS) {
    this.intervalMs = intervalMs;
  }

  /**
   * Start periodic background snapshotting.
   */
  start(): void {
    if (this.timer) {
      logger.warn('Usage snapshot background worker is already running');
      return;
    }

    logger.info({ intervalMs: this.intervalMs }, 'Starting usage snapshot background worker');

    // Run initial snapshot pass asynchronously after initial delay
    setTimeout(() => {
      this.runSnapshotPass().catch((err) => {
        logger.error({ err }, 'Initial usage snapshot worker pass failed');
      });
    }, constants.WORKER.SNAPSHOT_INITIAL_DELAY_MS);

    // Schedule recurring interval passes
    this.timer = setInterval(() => {
      this.runSnapshotPass().catch((err) => {
        logger.error({ err }, 'Scheduled usage snapshot worker pass failed');
      });
    }, this.intervalMs);
  }

  /**
   * Stop periodic background worker gracefully.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Stopped usage snapshot background worker');
    }
  }

  /**
   * Recalculates usage for a bucket with retries.
   */
  private async recalculateWithRetry(
    bucketName: string,
    organizationId: number,
  ): Promise<void> {
    const maxRetries = constants.WORKER.SNAPSHOT_MAX_RETRIES;
    const retryDelay = constants.WORKER.SNAPSHOT_RETRY_DELAY_MS;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await usageService.recalculateBucketUsage(bucketName, organizationId);
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        logger.warn(
          { bucketName, organizationId, attempt, maxRetries, retryDelay },
          `Snapshot recalculation failed for bucket '${bucketName}', retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Execute a single snapshot pass across all active buckets in PostgreSQL.
   */
  async runSnapshotPass(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Snapshot pass already in progress, skipping duplicate iteration');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const activeBuckets = await db
        .select()
        .from(buckets)
        .where(eq(buckets.isDeleted, false));

      logger.debug({ count: activeBuckets.length }, 'Beginning periodic storage usage snapshot pass');

      let successCount = 0;
      let failureCount = 0;

      for (const bucket of activeBuckets) {
        try {
          await this.recalculateWithRetry(bucket.name, bucket.organizationId);
          successCount += 1;
        } catch (error) {
          failureCount += 1;
          logger.error(
            { err: error, bucketName: bucket.name, organizationId: bucket.organizationId },
            `Failed to snapshot usage for bucket '${bucket.name}' after max retries`,
          );
        }
      }

      const durationMs = Date.now() - startTime;
      logger.info(
        { durationMs, totalBuckets: activeBuckets.length, successCount, failureCount },
        'Completed periodic storage usage snapshot pass',
      );
    } catch (error) {
      logger.error({ err: error }, 'Critical failure during storage snapshot background pass');
    } finally {
      this.isRunning = false;
    }
  }
}

export const snapshotWorker = new SnapshotWorker();
