import type { Request, Response } from 'express';
import { objectService } from '../services/object.service.js';
import { sendSuccess } from '../lib/response.js';
import type {
  PresignedUploadInput,
  PresignedDownloadInput,
  ListObjectsQueryInput,
  DeleteObjectInput,
  BatchDeleteObjectsInput,
} from '../validators/object.validators.js';

export class ObjectController {
  /**
   * POST /api/v1/storage/buckets/:name/objects/presigned-upload
   */
  async generatePresignedUpload(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const input = req.body as PresignedUploadInput;
    const orgId = req.organizationId ?? 1;

    const result = await objectService.generatePresignedUploadUrl(name, input, orgId);
    sendSuccess(res, result, 'Presigned upload URL generated successfully', 200);
  }

  /**
   * POST /api/v1/storage/buckets/:name/objects/presigned-download
   */
  async generatePresignedDownload(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const input = req.body as PresignedDownloadInput;
    const orgId = req.organizationId ?? 1;

    const result = await objectService.generatePresignedDownloadUrl(name, input, orgId);
    sendSuccess(res, result, 'Presigned download URL generated successfully', 200);
  }

  /**
   * GET /api/v1/storage/buckets/:name/objects
   */
  async listObjects(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const query = req.query as unknown as ListObjectsQueryInput;
    const orgId = req.organizationId ?? 1;

    const result = await objectService.listObjects(name, query, orgId);
    sendSuccess(res, result.objects, 'Bucket objects listed successfully', 200, {
      page: 1,
      limit: query.limit ?? 100,
      total: result.totalCount,
    });
  }

  /**
   * GET /api/v1/storage/buckets/:name/objects/stat
   */
  async getObjectMetadata(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const objectName = req.query.objectName as string;
    const orgId = req.organizationId ?? 1;

    const result = await objectService.getObjectMetadata(name, objectName, orgId);
    sendSuccess(res, result, 'Object metadata retrieved successfully', 200);
  }

  /**
   * DELETE /api/v1/storage/buckets/:name/objects
   */
  async deleteObject(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const input = req.body as DeleteObjectInput;
    const orgId = req.organizationId ?? 1;

    await objectService.deleteObject(name, input.objectName, orgId);
    sendSuccess(res, null, `Object '${input.objectName}' deleted successfully`, 200);
  }

  /**
   * POST /api/v1/storage/buckets/:name/objects/batch-delete
   */
  async batchDeleteObjects(req: Request, res: Response): Promise<void> {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const input = req.body as BatchDeleteObjectsInput;
    const orgId = req.organizationId ?? 1;

    const result = await objectService.batchDeleteObjects(name, input.objectNames, orgId);
    sendSuccess(res, result, 'Batch object deletion completed', 200);
  }
}

export const objectController = new ObjectController();
