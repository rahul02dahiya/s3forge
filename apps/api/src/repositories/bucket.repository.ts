import { db } from '../config/database.js';
import { buckets } from '@s3forge/database';
import { eq, and, count, sql } from 'drizzle-orm';

export interface CreateBucketParams {
  organizationId: number;
  name: string;
  minioBucketName: string;
  region?: string;
  visibility?: 'private' | 'public';
  quotaBytes?: number;
}

export type BucketRecord = typeof buckets.$inferSelect;

export class BucketRepository {
  /**
   * Find active (non-deleted) bucket by user-facing name within an organization.
   */
  async findByName(organizationId: number, name: string): Promise<BucketRecord | undefined> {
    const [record] = await db
      .select()
      .from(buckets)
      .where(
        and(
          eq(buckets.organizationId, organizationId),
          eq(buckets.name, name),
          eq(buckets.isDeleted, false),
        ),
      );
    return record;
  }

  /**
   * Find bucket by internal MinIO unique bucket name.
   */
  async findByMinioName(minioBucketName: string): Promise<BucketRecord | undefined> {
    const [record] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.minioBucketName, minioBucketName));
    return record;
  }

  /**
   * Find paginated active buckets for an organization.
   */
  async findPaginated(
    organizationId: number,
    limit: number,
    offset: number,
  ): Promise<{ data: BucketRecord[]; total: number }> {
    const whereClause = and(
      eq(buckets.organizationId, organizationId),
      eq(buckets.isDeleted, false),
    );

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(buckets)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(buckets.createdAt),
      db
        .select({ value: count() })
        .from(buckets)
        .where(whereClause),
    ]);

    return {
      data,
      total: Number(totalResult[0]?.value ?? 0),
    };
  }

  /**
   * Persist a new bucket record in PostgreSQL.
   */
  async create(params: CreateBucketParams): Promise<BucketRecord> {
    const [inserted] = await db
      .insert(buckets)
      .values({
        organizationId: params.organizationId,
        name: params.name,
        minioBucketName: params.minioBucketName,
        region: params.region ?? 'us-east-1',
        visibility: params.visibility ?? 'private',
        quotaBytes: params.quotaBytes ?? 0,
        isDeleted: false,
      })
      .returning();

    return inserted;
  }

  /**
   * Soft-delete a bucket by ID.
   */
  async softDelete(id: number): Promise<BucketRecord | undefined> {
    const [updated] = await db
      .update(buckets)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(buckets.id, id))
      .returning();

    return updated;
  }
}

export const bucketRepository = new BucketRepository();
