import { Router } from 'express';
import { storageController } from '../controllers/storage.controller.js';
import { usageController } from '../controllers/usage.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  CreateBucketSchema,
  BucketNameParamSchema,
  ListBucketsQuerySchema,
} from '../validators/storage.validators.js';
import { UsageHistoryQuerySchema } from '../validators/usage.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Paths for Storage & Usage Endpoints
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/v1/storage/usage',
  summary: 'Get organization-wide storage usage summary',
  tags: ['Storage Usage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  responses: {
    200: { description: 'Aggregated storage and object count metrics across all buckets' },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/v1/storage/buckets',
  summary: 'List all storage buckets',
  tags: ['Storage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    query: ListBucketsQuerySchema,
  },
  responses: {
    200: { description: 'Paginated list of active buckets' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/api/v1/storage/buckets',
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
  path: '/api/v1/storage/buckets/{name}',
  summary: 'Get details of a specific storage bucket',
  tags: ['Storage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
  },
  responses: {
    200: { description: 'Bucket details' },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/v1/storage/buckets/{name}',
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
  path: '/api/v1/storage/buckets/{name}/usage',
  summary: 'Get bucket storage usage and history trend',
  tags: ['Storage Usage'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    params: BucketNameParamSchema,
    query: UsageHistoryQuerySchema,
  },
  responses: {
    200: { description: 'Bucket usage metrics and snapshot history' },
    404: { description: 'Bucket not found' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/api/v1/storage/buckets/{name}/usage/recalculate',
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

// Route Definitions
router.get(
  '/usage',
  authenticate({ optional: true }),
  (req, res, next) => usageController.getOrganizationUsage(req, res).catch(next),
);

router.get(
  '/buckets',
  authenticate({ optional: true }),
  validate({ query: ListBucketsQuerySchema }),
  (req, res, next) => storageController.listBuckets(req, res).catch(next),
);

router.post(
  '/buckets',
  authenticate({ optional: true }),
  validate({ body: CreateBucketSchema }),
  (req, res, next) => storageController.createBucket(req, res).catch(next),
);

router.get(
  '/buckets/:name',
  authenticate({ optional: true }),
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => storageController.getBucket(req, res).catch(next),
);

router.delete(
  '/buckets/:name',
  authenticate({ optional: true }),
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => storageController.deleteBucket(req, res).catch(next),
);

router.get(
  '/buckets/:name/usage',
  authenticate({ optional: true }),
  validate({ params: BucketNameParamSchema, query: UsageHistoryQuerySchema }),
  (req, res, next) => usageController.getBucketUsage(req, res).catch(next),
);

router.post(
  '/buckets/:name/usage/recalculate',
  authenticate({ optional: true }),
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => usageController.recalculateBucketUsage(req, res).catch(next),
);

export default router;