import { db } from '../config/database.js';
import { usageSnapshots, buckets } from '@s3forge/database';
import { eq, desc, inArray } from 'drizzle-orm';

export interface CreateSnapshotData {
  bucketId: number;
  objectCount: number;
  totalBytes: number;
}

export class UsageSnapshotRepository {
  /**
   * Insert a new usage snapshot for a bucket.
   */
  async createSnapshot(data: CreateSnapshotData) {
    const [snapshot] = await db
      .insert(usageSnapshots)
      .values({
        bucketId: data.bucketId,
        objectCount: data.objectCount,
        totalBytes: data.totalBytes,
      })
      .returning();

    return snapshot;
  }

  /**
   * Get latest snapshot for a bucket.
   */
  async getLatestSnapshot(bucketId: number) {
    const [snapshot] = await db
      .select()
      .from(usageSnapshots)
      .where(eq(usageSnapshots.bucketId, bucketId))
      .orderBy(desc(usageSnapshots.calculatedAt))
      .limit(1);

    return snapshot ?? null;
  }

  /**
   * Get snapshot history for a bucket.
   */
  async getSnapshotHistory(bucketId: number, limit: number = 30) {
    return await db
      .select()
      .from(usageSnapshots)
      .where(eq(usageSnapshots.bucketId, bucketId))
      .orderBy(desc(usageSnapshots.calculatedAt))
      .limit(limit);
  }

  /**
   * Get latest snapshot for multiple buckets (for organization usage aggregation).
   */
  async getLatestSnapshotsForBuckets(bucketIds: number[]) {
    if (bucketIds.length === 0) return [];

    return await db
      .select()
      .from(usageSnapshots)
      .where(inArray(usageSnapshots.bucketId, bucketIds))
      .orderBy(desc(usageSnapshots.calculatedAt));
  }
}

export const usageSnapshotRepository = new UsageSnapshotRepository();
