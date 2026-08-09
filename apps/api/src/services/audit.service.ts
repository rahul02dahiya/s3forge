import type { Request } from 'express';
import { auditLogRepository } from '../repositories/audit-log.repository.js';
import { logger } from '../lib/logger.js';

export interface AuditEventParams {
  req?: Request;
  organizationId?: number;
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Asynchronously record an audit log event without blocking the primary request response flow.
   */
  async recordAudit(params: AuditEventParams): Promise<void> {
    try {
      const orgId = params.organizationId ?? params.req?.organizationId ?? 1;
      const userId = params.userId ?? params.req?.user?.userId;
      const ipAddress = params.req?.ip || (params.req?.headers['x-forwarded-for'] as string) || undefined;
      const userAgent = params.req?.headers['user-agent'] as string | undefined;

      await auditLogRepository.create({
        organizationId: orgId,
        userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress,
        userAgent,
        metadata: params.metadata,
      });

      logger.info(
        { action: params.action, resourceType: params.resourceType, organizationId: orgId },
        'Recorded audit log event',
      );
    } catch (error) {
      logger.error({ err: error, action: params.action }, 'Failed to record audit log event');
    }
  }

  /**
   * Retrieve paginated audit logs for an organization.
   */
  async listAuditLogs(
    organizationId: number = 1,
    page: number = 1,
    limit: number = 50,
    actionFilter?: string,
  ) {
    const result = await auditLogRepository.findPaginatedByOrganization(
      organizationId,
      page,
      limit,
      actionFilter,
    );

    return {
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}

export const auditService = new AuditService();
