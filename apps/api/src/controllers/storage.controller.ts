import type { Request, Response } from 'express';
import { storageService } from '../services/storage.service.js';
import { sendSuccess } from '../lib/response.js';
import { AppError } from '../lib/app-error.js';
import type { CreateBucketInput, ListBucketsQueryInput } from '../validators/storage.validators.js';

/**
 * Controller handling bucket storage operations.
 */
export class StorageController {
  private getOrgId(req: Request): number {
    const orgId = req.organizationId;
    if (!orgId) {
      throw AppError.unauthorized('Organization contextual scope required');
    }
    return orgId;
  }

  /**
   * POST /api/v1/storage/buckets
   */
  async createBucket(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const userId = req.user?.userId;
    const input: CreateBucketInput = req.body;
    const bucket = await storageService.createBucket(input, orgId, userId!);

    sendSuccess(res, bucket, 'Bucket created successfully', 201);
  }

  /**
   * GET /api/v1/storage/buckets
   */
  async listBuckets(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const query = req.query as unknown as ListBucketsQueryInput;
    const { data, meta } = await storageService.listBuckets(query.page, query.limit, orgId);

    sendSuccess(res, data, 'Buckets retrieved successfully', 200, meta);
  }

  /**
   * GET /api/v1/storage/buckets/:name
   */
  async getBucket(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const bucket = await storageService.getBucketByName(name, orgId);

    sendSuccess(res, bucket, 'Bucket retrieved successfully', 200);
  }

  /**
   * PATCH /api/v1/storage/buckets/:name
   */
  async updateBucket(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const userId = req.user?.userId;
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const bucket = await storageService.updateBucketByName(name, orgId, req.body, userId);

    sendSuccess(res, bucket, 'Bucket updated successfully', 200);
  }

  /**
   * DELETE /api/v1/storage/buckets/:name
   */
  async deleteBucket(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const userId = req.user?.userId;
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    await storageService.deleteBucketByName(name, orgId, userId);

    sendSuccess(res, null, 'Bucket deleted successfully', 200);
  }
}

export const storageController = new StorageController();
