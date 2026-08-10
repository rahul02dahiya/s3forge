import type { Request, Response } from 'express';
import { usageService } from '../services/usage.service.js';
import { sendSuccess } from '../lib/response.js';
import type { UsageHistoryQueryInput } from '../validators/usage.validators.js';

export class UsageController {
  /**
   * GET /api/v1/storage/usage
   */
  async getOrganizationUsage(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId ?? 1;
    const usage = await usageService.getOrganizationUsage(orgId);

    sendSuccess(res, usage, 'Organization usage metrics retrieved successfully', 200);
  }

  /**
   * GET /api/v1/storage/buckets/:name/usage
   */
  async getBucketUsage(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const query = req.query as unknown as UsageHistoryQueryInput;
    const orgId = req.organizationId ?? 1;

    const usage = await usageService.getBucketUsage(name, orgId, query.limit);
    sendSuccess(res, usage, 'Bucket usage metrics retrieved successfully', 200);
  }

  /**
   * POST /api/v1/storage/buckets/:name/usage/recalculate
   */
  async recalculateBucketUsage(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const orgId = req.organizationId ?? 1;

    const usage = await usageService.recalculateBucketUsage(name, orgId);
    sendSuccess(res, usage, 'Bucket usage recalculation complete', 200);
  }
}

export const usageController = new UsageController();
