import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

/**
 * Zod schema for querying audit logs with pagination and action filtering.
 */
export const ListAuditLogsQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1))
      .openapi({ description: 'Page number (default: 1)', example: '1' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 50))
      .openapi({ description: 'Items per page (default: 50, max: 100)', example: '50' }),
    action: z
      .string()
      .optional()
      .openapi({ description: 'Optional action filter (e.g. bucket.create)', example: 'bucket.create' }),
  })
  .openapi('ListAuditLogsQuery');

export type ListAuditLogsQueryInput = z.infer<typeof ListAuditLogsQuerySchema>;
