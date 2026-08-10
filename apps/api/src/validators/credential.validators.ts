import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { constants } from '@s3forge/config';

extendZodWithOpenApi(z);

/**
 * Zod schema for creating a new S3 credential keypair.
 */
export const CreateCredentialSchema = z
  .object({
    description: z
      .string()
      .max(255, 'Description cannot exceed 255 characters')
      .optional()
      .openapi({
        description: 'Optional human-readable description for the S3 credential',
        example: 'CI/CD Deployment Key',
      }),
  })
  .openapi('CreateCredentialInput');

export type CreateCredentialInput = z.infer<typeof CreateCredentialSchema>;

/**
 * Zod schema for credential ID route parameter validation.
 */
export const CredentialIdParamSchema = z
  .object({
    id: z
      .string()
      .regex(/^\d+$/, 'Credential ID must be a valid positive integer')
      .transform(Number)
      .openapi({
        description: 'Numeric primary key ID of the credential',
        example: '1',
      }),
  })
  .openapi('CredentialIdParam');

/**
 * Zod schema for credential query parameters (pagination).
 */
export const ListCredentialsQuerySchema = z
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
          : constants.PAGINATION.DEFAULT_LIMIT,
      )
      .openapi({
        description: `Items per page (default: ${constants.PAGINATION.DEFAULT_LIMIT}, max: ${constants.PAGINATION.MAX_LIMIT})`,
        example: String(constants.PAGINATION.DEFAULT_LIMIT),
      }),
  })
  .openapi('ListCredentialsQuery');

export type ListCredentialsQueryInput = z.infer<typeof ListCredentialsQuerySchema>;
