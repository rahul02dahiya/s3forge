import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const PresignedUploadSchema = z
  .object({
    objectName: z
      .string()
      .min(1, 'objectName is required')
      .openapi({ description: 'Name/path of the object to upload', example: 'photos/vacation.jpg' }),
    expirySeconds: z
      .number()
      .min(60, 'Expiry must be at least 60 seconds')
      .max(604800, 'Expiry cannot exceed 7 days (604800 seconds)')
      .optional()
      .default(3600)
      .openapi({ description: 'Presigned URL expiration in seconds (default: 3600)', example: 3600 }),
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
      .min(60, 'Expiry must be at least 60 seconds')
      .max(604800, 'Expiry cannot exceed 7 days (604800 seconds)')
      .optional()
      .default(3600)
      .openapi({ description: 'Presigned URL expiration in seconds (default: 3600)', example: 3600 }),
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
      .transform((val) => val === 'true')
      .openapi({ description: 'Recursively search nested directories (default: true)', example: 'true' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(1000, Math.max(1, parseInt(val, 10))) : 100))
      .openapi({ description: 'Maximum number of objects to return (default: 100)', example: '100' }),
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
      .max(1000, 'Cannot delete more than 1000 objects in a single batch')
      .openapi({ description: 'Array of object key names to delete', example: ['file1.txt', 'file2.txt'] }),
  })
  .openapi('BatchDeleteObjectsInput');

export type BatchDeleteObjectsInput = z.infer<typeof BatchDeleteObjectsSchema>;
