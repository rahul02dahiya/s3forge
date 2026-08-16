import { Router } from 'express';
import { storageController } from '../controllers/storage.controller.js';
import { usageController } from '../controllers/usage.controller.js';
import { objectController } from '../controllers/object.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import {
  CreateBucketSchema,
  BucketNameParamSchema,
  ListBucketsQuerySchema,
  BucketListResponseSchema,
  BucketDetailResponseSchema,
} from '../validators/storage.validators.js';
import { UsageHistoryQuerySchema, OrganizationUsageResponseSchema, BucketUsageResponseSchema } from '../validators/usage.validators.js';
import {
  PresignedUploadSchema,
  PresignedDownloadSchema,
  ListObjectsQuerySchema,
  DeleteObjectSchema,
  BatchDeleteObjectsSchema,
  ListObjectsResponseSchema,
  PresignedUploadResponseSchema,
  PresignedDownloadResponseSchema,
} from '../validators/object.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Paths for Storage, Usage & Object Endpoints
openApiRegistry.registerPath({
  method: 'get',
  path: '/storage/usage',
  summary: 'Get organization-wide storage usage summary',
  tags: ['Storage Usage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  responses: {
    200: { 
      description: 'Aggregated storage and object count metrics across all buckets',
      content: { 'application/json': { schema: OrganizationUsageResponseSchema } }
    },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/storage/buckets',
  summary: 'List all storage buckets',
  tags: ['Storage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    query: ListBucketsQuerySchema,
  },
  responses: {
    200: { 
      description: 'Paginated list of active buckets',
      content: { 'application/json': { schema: BucketListResponseSchema } }
    },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/storage/buckets',
  summary: 'Create a new storage bucket',
  tags: ['Storage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateBucketSchema },
      },
    },
  },
  responses: {
    201: { description: 'Bucket created successfully' },
    400: { description: 'Validation error' },
    409: { description: 'Bucket already exists' },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/storage/buckets/{name}',
  summary: 'Get details of a specific storage bucket',
  tags: ['Storage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
  },
  responses: {
    200: { 
      description: 'Bucket details',
      content: { 'application/json': { schema: BucketDetailResponseSchema } }
    },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/storage/buckets/{name}',
  summary: 'Soft-delete a storage bucket',
  tags: ['Storage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
  },
  responses: {
    200: { description: 'Bucket soft-deleted successfully' },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/storage/buckets/{name}/usage',
  summary: 'Get bucket storage usage and history trend',
  tags: ['Storage Usage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
    query: UsageHistoryQuerySchema,
  },
  responses: {
    200: { 
      description: 'Bucket usage metrics and snapshot history',
      content: { 'application/json': { schema: BucketUsageResponseSchema } }
    },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/storage/buckets/{name}/usage/recalculate',
  summary: 'Trigger manual recalculation of bucket usage snapshot from MinIO',
  tags: ['Storage Usage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
  },
  responses: {
    200: { description: 'Bucket usage recalculation complete' },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/storage/buckets/{name}/objects/presigned-upload',
  summary: 'Generate presigned PUT URL for direct client S3 object upload',
  tags: ['Objects'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
    body: {
      content: {
        'application/json': { schema: PresignedUploadSchema },
      },
    },
  },
  responses: {
    200: { 
      description: 'Presigned upload URL generated successfully',
      content: { 'application/json': { schema: PresignedUploadResponseSchema } }
    },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/storage/buckets/{name}/objects/presigned-download',
  summary: 'Generate presigned GET URL for temporary file download',
  tags: ['Objects'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
    body: {
      content: {
        'application/json': { schema: PresignedDownloadSchema },
      },
    },
  },
  responses: {
    200: { 
      description: 'Presigned download URL generated successfully',
      content: { 'application/json': { schema: PresignedDownloadResponseSchema } }
    },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/storage/buckets/{name}/objects',
  summary: 'List objects within a storage bucket',
  tags: ['Objects'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
    query: ListObjectsQuerySchema,
  },
  responses: {
    200: { 
      description: 'List of bucket objects',
      content: { 'application/json': { schema: ListObjectsResponseSchema } }
    },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/storage/buckets/{name}/objects',
  summary: 'Delete a single object from a storage bucket',
  tags: ['Objects'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
    body: {
      content: {
        'application/json': { schema: DeleteObjectSchema },
      },
    },
  },
  responses: {
    200: { description: 'Object deleted successfully' },
    404: { description: 'Bucket or object not found' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/storage/buckets/{name}/objects/batch-delete',
  summary: 'Batch delete multiple objects from a storage bucket',
  tags: ['Objects'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
    body: {
      content: {
        'application/json': { schema: BatchDeleteObjectsSchema },
      },
    },
  },
  responses: {
    200: { description: 'Batch objects deleted successfully' },
    404: { description: 'Bucket not found' },
  },
});

// Route Definitions
router.get(
  '/usage',
  authenticate(),
  (req, res, next) => usageController.getOrganizationUsage(req, res).catch(next),
);

router.get(
  '/buckets',
  authenticate(),
  validate({ query: ListBucketsQuerySchema }),
  (req, res, next) => storageController.listBuckets(req, res).catch(next),
);

router.post(
  '/buckets',
  authenticate(),
  requireRole(['owner', 'admin']),
  validate({ body: CreateBucketSchema }),
  (req, res, next) => storageController.createBucket(req, res).catch(next),
);

router.get(
  '/buckets/:name',
  authenticate(),
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => storageController.getBucket(req, res).catch(next),
);

router.delete(
  '/buckets/:name',
  authenticate(),
  requireRole(['owner', 'admin']),
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => storageController.deleteBucket(req, res).catch(next),
);

router.get(
  '/buckets/:name/usage',
  authenticate(),
  validate({ params: BucketNameParamSchema, query: UsageHistoryQuerySchema }),
  (req, res, next) => usageController.getBucketUsage(req, res).catch(next),
);

router.post(
  '/buckets/:name/usage/recalculate',
  authenticate(),
  requireRole(['owner', 'admin']),
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => usageController.recalculateBucketUsage(req, res).catch(next),
);

// Object Routes
router.post(
  '/buckets/:name/objects/presigned-upload',
  authenticate(),
  validate({ params: BucketNameParamSchema, body: PresignedUploadSchema }),
  (req, res, next) => objectController.generatePresignedUpload(req, res).catch(next),
);

router.post(
  '/buckets/:name/objects/presigned-download',
  authenticate(),
  validate({ params: BucketNameParamSchema, body: PresignedDownloadSchema }),
  (req, res, next) => objectController.generatePresignedDownload(req, res).catch(next),
);

router.get(
  '/buckets/:name/objects',
  authenticate(),
  validate({ params: BucketNameParamSchema, query: ListObjectsQuerySchema }),
  (req, res, next) => objectController.listObjects(req, res).catch(next),
);

router.get(
  '/buckets/:name/objects/stat',
  authenticate(),
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => objectController.getObjectMetadata(req, res).catch(next),
);

router.delete(
  '/buckets/:name/objects',
  authenticate(),
  validate({ params: BucketNameParamSchema, body: DeleteObjectSchema }),
  (req, res, next) => objectController.deleteObject(req, res).catch(next),
);

router.post(
  '/buckets/:name/objects/batch-delete',
  authenticate(),
  validate({ params: BucketNameParamSchema, body: BatchDeleteObjectsSchema }),
  (req, res, next) => objectController.batchDeleteObjects(req, res).catch(next),
);

export default router;
