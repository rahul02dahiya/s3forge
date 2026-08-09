import { Router } from 'express';
import { storageController } from '../controllers/storage.controller.js';
import { validate } from '../middleware/validate.js';
import {
  CreateBucketSchema,
  BucketNameParamSchema,
  ListBucketsQuerySchema,
} from '../validators/storage.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Paths for Storage Endpoints
openApiRegistry.registerPath({
  method: 'get',
  path: '/api/v1/storage/buckets',
  summary: 'List all storage buckets',
  tags: ['Storage'],
  request: {
    query: ListBucketsQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated list of active buckets',
    },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/api/v1/storage/buckets',
  summary: 'Create a new storage bucket',
  tags: ['Storage'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBucketSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Bucket created successfully',
    },
    400: {
      description: 'Validation error',
    },
    409: {
      description: 'Bucket already exists',
    },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/v1/storage/buckets/{name}',
  summary: 'Get details of a specific storage bucket',
  tags: ['Storage'],
  request: {
    params: BucketNameParamSchema,
  },
  responses: {
    200: {
      description: 'Bucket details',
    },
    404: {
      description: 'Bucket not found',
    },
  },
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/v1/storage/buckets/{name}',
  summary: 'Soft-delete a storage bucket',
  tags: ['Storage'],
  request: {
    params: BucketNameParamSchema,
  },
  responses: {
    200: {
      description: 'Bucket soft-deleted successfully',
    },
    404: {
      description: 'Bucket not found',
    },
  },
});

// Route Definitions
router.get(
  '/buckets',
  validate({ query: ListBucketsQuerySchema }),
  (req, res, next) => storageController.listBuckets(req, res).catch(next),
);

router.post(
  '/buckets',
  validate({ body: CreateBucketSchema }),
  (req, res, next) => storageController.createBucket(req, res).catch(next),
);

router.get(
  '/buckets/:name',
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => storageController.getBucket(req, res).catch(next),
);

router.delete(
  '/buckets/:name',
  validate({ params: BucketNameParamSchema }),
  (req, res, next) => storageController.deleteBucket(req, res).catch(next),
);

export default router;