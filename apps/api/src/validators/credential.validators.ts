import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

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
      .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1))
      .openapi({ description: 'Page number (default: 1)', example: '1' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20))
      .openapi({ description: 'Items per page (default: 20, max: 100)', example: '20' }),
  })
  .openapi('ListCredentialsQuery');

export type ListCredentialsQueryInput = z.infer<typeof ListCredentialsQuerySchema>;
