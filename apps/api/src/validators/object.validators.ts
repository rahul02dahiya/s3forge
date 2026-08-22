import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { constants } from '@s3forge/config';

extendZodWithOpenApi(z);

export const PresignedUploadSchema = z
  .object({
    objectName: z
      .string()
      .min(1, 'objectName is required')
      .openapi({ description: 'Name/path of the object to upload', example: 'photos/vacation.jpg' }),
    expirySeconds: z
      .number()
      .min(
        constants.STORAGE.MIN_PRESIGNED_EXPIRY_SECONDS,
        `Expiry must be at least ${constants.STORAGE.MIN_PRESIGNED_EXPIRY_SECONDS} seconds`,
      )
      .max(
        constants.STORAGE.MAX_PRESIGNED_EXPIRY_SECONDS,
        `Expiry cannot exceed ${constants.STORAGE.MAX_PRESIGNED_EXPIRY_SECONDS} seconds`,
      )
      .optional()
      .default(constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS)
      .openapi({
        description: `Presigned URL expiration in seconds (default: ${constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS})`,
        example: constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS,
      }),
    contentType: z
      .string()
      .optional()
      .openapi({ description: 'Expected MIME content type', example: 'image/jpeg' }),
  })
  .openapi('PresignedUploadInput');

export type PresignedUploadInput = z.infer<typeof PresignedUploadSchema>;

export const PresignedDownloadSchema = z
  .object({
    objectName: z
      .string()
      .min(1, 'objectName is required')
      .openapi({ description: 'Name/path of the object to download', example: 'photos/vacation.jpg' }),
    expirySeconds: z
      .number()
      .min(
        constants.STORAGE.MIN_PRESIGNED_EXPIRY_SECONDS,
        `Expiry must be at least ${constants.STORAGE.MIN_PRESIGNED_EXPIRY_SECONDS} seconds`,
      )
      .max(
        constants.STORAGE.MAX_PRESIGNED_EXPIRY_SECONDS,
        `Expiry cannot exceed ${constants.STORAGE.MAX_PRESIGNED_EXPIRY_SECONDS} seconds`,
      )
      .optional()
      .default(constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS)
      .openapi({
        description: `Presigned URL expiration in seconds (default: ${constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS})`,
        example: constants.STORAGE.DEFAULT_PRESIGNED_EXPIRY_SECONDS,
      }),
  })
  .openapi('PresignedDownloadInput');

export type PresignedDownloadInput = z.infer<typeof PresignedDownloadSchema>;

export const ListObjectsQuerySchema = z
  .object({
    prefix: z
      .string()
      .optional()
      .openapi({ description: 'Filter objects by key prefix', example: 'photos/' }),
    recursive: z
      .string()
      .optional()
      .transform((val) => val !== 'false')
      .openapi({ description: 'Recursively search nested directories (default: true)', example: 'true' }),
    limit: z
      .string()
      .optional()
      .transform((val) =>
        val
          ? Math.min(
              constants.PAGINATION.MAX_OBJECT_LIMIT,
              Math.max(1, parseInt(val, 10)),
            )
          : constants.PAGINATION.DEFAULT_OBJECT_LIMIT,
      )
      .openapi({
        description: `Maximum number of objects to return (default: ${constants.PAGINATION.DEFAULT_OBJECT_LIMIT})`,
        example: String(constants.PAGINATION.DEFAULT_OBJECT_LIMIT),
      }),
  })
  .openapi('ListObjectsQuery');

export type ListObjectsQueryInput = z.infer<typeof ListObjectsQuerySchema>;

export const DeleteObjectSchema = z
  .object({
    objectName: z
      .string()
      .min(1, 'objectName is required')
      .openapi({ description: 'Name/path of the object to delete', example: 'photos/vacation.jpg' }),
  })
  .openapi('DeleteObjectInput');

export type DeleteObjectInput = z.infer<typeof DeleteObjectSchema>;

export const BatchDeleteObjectsSchema = z
  .object({
    objectNames: z
      .array(z.string().min(1))
      .min(1, 'At least one object name is required')
      .max(
        constants.STORAGE.MAX_BATCH_DELETE_SIZE,
        `Cannot delete more than ${constants.STORAGE.MAX_BATCH_DELETE_SIZE} objects in a single batch`,
      )
      .openapi({ description: 'Array of object key names to delete', example: ['file1.txt', 'file2.txt'] }),
  })
  .openapi('BatchDeleteObjectsInput');

export type BatchDeleteObjectsInput = z.infer<typeof BatchDeleteObjectsSchema>;

export const ObjectMetadataSchema = z.object({
  name: z.string(),
  lastModified: z.date().or(z.string()),
  size: z.number(),
  etag: z.string().optional(),
}).openapi('ObjectMetadata');

export const ListObjectsResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.array(ObjectMetadataSchema),
}).openapi('ListObjectsResponse');

export const PresignedUploadResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.object({
    url: z.string().url(),
    objectName: z.string(),
    method: z.literal('PUT'),
    expiresAt: z.string(),
  })
}).openapi('PresignedUploadResponse');

export const PresignedDownloadResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.object({
    url: z.string().url(),
    objectName: z.string(),
    method: z.literal('GET'),
    expiresAt: z.string(),
  })
}).openapi('PresignedDownloadResponse');

