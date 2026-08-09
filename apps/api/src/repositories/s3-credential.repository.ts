import { db } from '../config/database.js';
import { s3Credentials } from '@s3forge/database';
import { eq, and, sql, desc } from 'drizzle-orm';

export interface CreateS3CredentialData {
  organizationId: number;
  accessKey: string;
  secretKeyHash: string;
  description?: string;
}

export class S3CredentialRepository {
  /**
   * Insert a new S3 credential keypair into the database.
   */
  async create(data: CreateS3CredentialData) {
    const [credential] = await db
      .insert(s3Credentials)
      .values({
        organizationId: data.organizationId,
        accessKey: data.accessKey,
        secretKeyHash: data.secretKeyHash,
        description: data.description ?? null,
      })
      .returning();

    return credential;
  }

  /**
   * Find a credential by ID and organization ID.
   */
  async findById(id: number, organizationId: number) {
    const [credential] = await db
      .select()
      .from(s3Credentials)
      .where(and(eq(s3Credentials.id, id), eq(s3Credentials.organizationId, organizationId)))
      .limit(1);

    return credential ?? null;
  }

  /**
   * Find a credential by access key.
   */
  async findByAccessKey(accessKey: string) {
    const [credential] = await db
      .select()
      .from(s3Credentials)
      .where(eq(s3Credentials.accessKey, accessKey))
      .limit(1);

    return credential ?? null;
  }

  /**
   * Find all credentials for an organization with pagination.
   */
  async findPaginatedByOrganization(organizationId: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const dataQuery = db
      .select({
        id: s3Credentials.id,
        organizationId: s3Credentials.organizationId,
        accessKey: s3Credentials.accessKey,
        description: s3Credentials.description,
        isActive: s3Credentials.isActive,
        lastUsedAt: s3Credentials.lastUsedAt,
        createdAt: s3Credentials.createdAt,
      })
      .from(s3Credentials)
      .where(eq(s3Credentials.organizationId, organizationId))
      .orderBy(desc(s3Credentials.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(s3Credentials)
      .where(eq(s3Credentials.organizationId, organizationId));

    const [data, [{ count }]] = await Promise.all([dataQuery, countQuery]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Update active status (enable/revoke) of a credential.
   */
  async updateStatus(id: number, organizationId: number, isActive: boolean) {
    const [updated] = await db
      .update(s3Credentials)
      .set({ isActive })
      .where(and(eq(s3Credentials.id, id), eq(s3Credentials.organizationId, organizationId)))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete a credential by ID and organization ID.
   */
  async delete(id: number, organizationId: number) {
    const [deleted] = await db
      .delete(s3Credentials)
      .where(and(eq(s3Credentials.id, id), eq(s3Credentials.organizationId, organizationId)))
      .returning();

    return deleted ?? null;
  }

  /**
   * Touch last_used_at timestamp for a credential.
   */
  async updateLastUsed(accessKey: string) {
    await db
      .update(s3Credentials)
      .set({ lastUsedAt: new Date() })
      .where(eq(s3Credentials.accessKey, accessKey));
  }
}

export const s3CredentialRepository = new S3CredentialRepository();
