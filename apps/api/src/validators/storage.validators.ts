import { z } from 'zod';
import { openApiRegistry } from '../config/swagger.js';
import { constants } from '@s3forge/config';

export const CreateBucketSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Bucket name must be at least 3 characters long')
      .max(63, 'Bucket name cannot exceed 63 characters')
      .regex(
        constants.STORAGE.BUCKET_NAME_REGEX,
        'Bucket name must contain only lowercase letters, numbers, hyphens, and dots, and start/end with an alphanumeric character',
      )
      .openapi({
        description: 'User-defined bucket name',
        example: 'my-app-assets',
      }),
    region: z
      .string()
      .default(constants.STORAGE.DEFAULT_REGION)
      .openapi({
        description: 'S3 storage region',
        example: constants.STORAGE.DEFAULT_REGION,
      }),
    visibility: z
      .enum(['private', 'public'])
      .default('private')
      .openapi({
        description: 'Bucket access visibility',
        example: 'private',
      }),
    quotaBytes: z
      .number()
      .int()
      .min(0)
      .default(0)
      .openapi({
        description: 'Optional storage quota limit in bytes (0 = unlimited)',
        example: 10737418240, // 10 GB
      }),
  })
  .openapi('CreateBucketRequest');

export const UpdateBucketSchema = z
  .object({
    visibility: z
      .enum(['private', 'public'])
      .optional()
      .openapi({
        description: 'Updated bucket access visibility',
        example: 'public',
      }),
    quotaBytes: z
      .number()
      .int()
      .min(0)
      .optional()
      .openapi({
        description: 'Updated storage quota limit in bytes',
        example: 21474836480,
      }),
  })
  .openapi('UpdateBucketRequest');

export const BucketNameParamSchema = z
  .object({
    name: z
      .string()
      .min(3)
      .max(63)
      .regex(constants.STORAGE.BUCKET_NAME_REGEX)
      .openapi({
        description: 'Unique name of the bucket',
        example: 'my-app-assets',
      }),
  })
  .openapi('BucketNameParam');

export const ListBucketsQuerySchema = z
  .object({
    page: z
      .coerce
      .number()
      .int()
      .min(1)
      .default(constants.PAGINATION.DEFAULT_PAGE)
      .openapi({ description: 'Page number for pagination', example: constants.PAGINATION.DEFAULT_PAGE }),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(constants.PAGINATION.MAX_LIMIT)
      .default(constants.PAGINATION.DEFAULT_LIMIT)
      .openapi({
        description: `Number of items per page (max ${constants.PAGINATION.MAX_LIMIT})`,
        example: constants.PAGINATION.DEFAULT_LIMIT,
      }),
  })
  .openapi('ListBucketsQuery');

// Register Schemas with OpenAPI Registry
openApiRegistry.register('CreateBucketRequest', CreateBucketSchema);
openApiRegistry.register('UpdateBucketRequest', UpdateBucketSchema);
openApiRegistry.register('BucketNameParam', BucketNameParamSchema);
openApiRegistry.register('ListBucketsQuery', ListBucketsQuerySchema);

export type CreateBucketInput = z.infer<typeof CreateBucketSchema>;
export type UpdateBucketInput = z.infer<typeof UpdateBucketSchema>;
export type BucketNameParamInput = z.infer<typeof BucketNameParamSchema>;
export type ListBucketsQueryInput = z.infer<typeof ListBucketsQuerySchema>;

export const BucketResponseSchema = z.object({
  id: z.number(),
  organizationId: z.number(),
  name: z.string(),
  minioBucketName: z.string(),
  region: z.string(),
  visibility: z.string(),
  quotaBytes: z.number(),
  isDeleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
}).openapi('Bucket');

export const BucketListResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.array(BucketResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number()
  }).optional()
}).openapi('BucketListResponse');

export const BucketDetailResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: BucketResponseSchema
}).openapi('BucketDetailResponse');

openApiRegistry.register('Bucket', BucketResponseSchema);
openApiRegistry.register('BucketListResponse', BucketListResponseSchema);
openApiRegistry.register('BucketDetailResponse', BucketDetailResponseSchema);
