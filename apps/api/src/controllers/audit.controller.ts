import type { Request, Response } from 'express';
import { auditService } from '../services/audit.service.js';
import { sendSuccess } from '../lib/response.js';
import { AppError } from '../lib/app-error.js';
import type { ListAuditLogsQueryInput } from '../validators/audit.validators.js';

export class AuditController {
  /**
   * GET /api/v1/audit-logs
   */
  async listAuditLogs(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListAuditLogsQueryInput;
    const orgId = req.organizationId;
    if (!orgId) {
      throw AppError.unauthorized('Organization contextual scope required');
    }

    const result = await auditService.listAuditLogs(orgId, query.page, query.limit, query.action);

    sendSuccess(
      res,
      result.data,
      'Audit log entries retrieved successfully',
      200,
      result.meta,
    );
  }
}

export const auditController = new AuditController();
