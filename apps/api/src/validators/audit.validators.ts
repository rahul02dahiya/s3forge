import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { constants } from '@s3forge/config';

extendZodWithOpenApi(z);

/**
 * Zod schema for querying audit logs with pagination and action filtering.
 */
export const ListAuditLogsQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : constants.PAGINATION.DEFAULT_PAGE))
      .openapi({
        description: `Page number (default: ${constants.PAGINATION.DEFAULT_PAGE})`,
        example: String(constants.PAGINATION.DEFAULT_PAGE),
      }),
    limit: z
      .string()
      .optional()
      .transform((val) =>
        val
          ? Math.min(constants.PAGINATION.MAX_LIMIT, Math.max(1, parseInt(val, 10)))
          : constants.PAGINATION.DEFAULT_AUDIT_LIMIT,
      )
      .openapi({
        description: `Items per page (default: ${constants.PAGINATION.DEFAULT_AUDIT_LIMIT}, max: ${constants.PAGINATION.MAX_LIMIT})`,
        example: String(constants.PAGINATION.DEFAULT_AUDIT_LIMIT),
      }),
    action: z
      .string()
      .optional()
      .openapi({ description: 'Optional action filter (e.g. bucket.create)', example: 'bucket.create' }),
  })
  .openapi('ListAuditLogsQuery');

export type ListAuditLogsQueryInput = z.infer<typeof ListAuditLogsQuerySchema>;

export const AuditLogResponseSchema = z.object({
  id: z.number(),
  organizationId: z.number(),
  userId: z.number().nullable(),
  userName: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  credentialId: z.number().nullable().optional(),
  action: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().nullable().optional(),
  resource: z.string().optional(),
  details: z.any().nullable().optional(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.union([z.string(), z.date()]),
}).openapi('AuditLogResponse');

export const AuditLogListResponseSchema = z.object({
  data: z.array(AuditLogResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
}).openapi('AuditLogListResponse');
