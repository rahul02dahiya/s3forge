import { db } from '../config/database.js';
import { auditLogs } from '@s3forge/database';
import { eq, and, sql, desc } from 'drizzle-orm';

export interface CreateAuditLogData {
  organizationId: number;
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogRepository {
  /**
   * Insert a new audit log record.
   */
  async create(data: CreateAuditLogData) {
    const [entry] = await db
      .insert(auditLogs)
      .values({
        organizationId: data.organizationId,
        userId: data.userId ?? null,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata ?? null,
      })
      .returning();

    return entry;
  }

  /**
   * Query paginated audit log entries for an organization.
   */
  async findPaginatedByOrganization(
    organizationId: number,
    page: number = 1,
    limit: number = 50,
    actionFilter?: string,
  ) {
    const offset = (page - 1) * limit;

    const whereConditions = [eq(auditLogs.organizationId, organizationId)];
    if (actionFilter) {
      whereConditions.push(eq(auditLogs.action, actionFilter));
    }

    const combinedWhere = and(...whereConditions);

    const dataQuery = db
      .select()
      .from(auditLogs)
      .where(combinedWhere)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(combinedWhere);

    const [data, [{ count }]] = await Promise.all([dataQuery, countQuery]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }
}

export const auditLogRepository = new AuditLogRepository();
