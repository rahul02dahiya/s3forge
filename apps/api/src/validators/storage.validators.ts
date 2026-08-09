import { z } from 'zod';
import { openApiRegistry } from '../config/swagger.js';

// Regex constraint matching S3/MinIO bucket naming standard
const BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

export const CreateBucketSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Bucket name must be at least 3 characters long')
      .max(63, 'Bucket name cannot exceed 63 characters')
      .regex(
        BUCKET_NAME_REGEX,
        'Bucket name must contain only lowercase letters, numbers, hyphens, and dots, and start/end with an alphanumeric character',
      )
      .openapi({
        description: 'User-defined bucket name',
        example: 'my-app-assets',
      }),
    region: z
      .string()
      .default('us-east-1')
      .openapi({
        description: 'S3 storage region',
        example: 'us-east-1',
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

export const BucketNameParamSchema = z
  .object({
    name: z
      .string()
      .min(3)
      .max(63)
      .regex(BUCKET_NAME_REGEX)
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
      .default(1)
      .openapi({ description: 'Page number for pagination', example: 1 }),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .openapi({ description: 'Number of items per page (max 100)', example: 20 }),
  })
  .openapi('ListBucketsQuery');

// Register Schemas with OpenAPI Registry
openApiRegistry.register('CreateBucketRequest', CreateBucketSchema);
openApiRegistry.register('BucketNameParam', BucketNameParamSchema);
openApiRegistry.register('ListBucketsQuery', ListBucketsQuerySchema);

export type CreateBucketInput = z.infer<typeof CreateBucketSchema>;
export type BucketNameParamInput = z.infer<typeof BucketNameParamSchema>;
export type ListBucketsQueryInput = z.infer<typeof ListBucketsQuerySchema>;
