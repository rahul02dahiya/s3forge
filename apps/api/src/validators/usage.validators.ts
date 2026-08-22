import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from '../config/swagger.js';

extendZodWithOpenApi(z);

/**
 * Zod schema for usage history query parameters.
 */
export const UsageHistoryQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1))
      .openapi({ description: 'Page number for historical snapshots (default: 1)', example: '1' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 30))
      .openapi({ description: 'Number of historical data points per page (default: 30)', example: '30' }),
  })
  .openapi('UsageHistoryQuery');

export type UsageHistoryQueryInput = z.infer<typeof UsageHistoryQuerySchema>;

export const OrganizationUsageResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.object({
    organizationId: z.number(),
    totalBuckets: z.number(),
    totalObjects: z.number(),
    totalStorageBytes: z.number(),
    bucketsUsage: z.array(z.object({
      id: z.number(),
      name: z.string(),
      objectCount: z.number(),
      totalBytes: z.number()
    }))
  })
}).openapi('OrganizationUsageResponse');

export const BucketUsageResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.object({
    bucket: z.object({
      id: z.number(),
      name: z.string(),
      minioBucketName: z.string(),
      region: z.string()
    }),
    currentUsage: z.object({
      objectCount: z.number(),
      totalBytes: z.number(),
      calculatedAt: z.string().nullable()
    }),
    history: z.array(z.object({
      objectCount: z.number(),
      totalBytes: z.number(),
      calculatedAt: z.string().nullable()
    })),
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number()
    })
  })
}).openapi('BucketUsageResponse');

openApiRegistry.register('OrganizationUsageResponse', OrganizationUsageResponseSchema);
openApiRegistry.register('BucketUsageResponse', BucketUsageResponseSchema);
