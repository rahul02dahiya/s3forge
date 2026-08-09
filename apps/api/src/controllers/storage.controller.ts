import type { Request, Response } from 'express';
import { storageService } from '../services/storage.service.js';
import { sendSuccess } from '../lib/response.js';
import type { CreateBucketInput, ListBucketsQueryInput } from '../validators/storage.validators.js';

/**
 * Controller handling bucket storage operations.
 */
export class StorageController {
  /**
   * POST /api/v1/storage/buckets
   */
  async createBucket(req: Request, res: Response): Promise<void> {
    const input: CreateBucketInput = req.body;
    const bucket = await storageService.createBucket(input);

    sendSuccess(res, bucket, 'Bucket created successfully', 201);
  }

  /**
   * GET /api/v1/storage/buckets
   */
  async listBuckets(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListBucketsQueryInput;
    const { data, meta } = await storageService.listBuckets(query.page, query.limit);

    sendSuccess(res, data, 'Buckets retrieved successfully', 200, meta);
  }

  /**
   * GET /api/v1/storage/buckets/:name
   */
  async getBucket(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const bucket = await storageService.getBucketByName(name);

    sendSuccess(res, bucket, 'Bucket retrieved successfully', 200);
  }

  /**
   * DELETE /api/v1/storage/buckets/:name
   */
  async deleteBucket(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    await storageService.deleteBucketByName(name);

    sendSuccess(res, null, 'Bucket deleted successfully', 200);
  }
}

export const storageController = new StorageController();
