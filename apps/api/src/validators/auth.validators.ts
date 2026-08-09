import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

/**
 * Zod schema for user registration.
 */
export const RegisterSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email address')
      .transform((val) => val.toLowerCase().trim())
      .openapi({ description: 'User email address', example: 'dev@s3forge.org' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .openapi({ description: 'Password (min 8 characters)', example: 'SecurePassword123!' }),
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(50, 'Display name cannot exceed 50 characters')
      .trim()
      .openapi({ description: 'Full name or display name', example: 'Alex Developer' }),
    organizationName: z
      .string()
      .min(2, 'Organization name must be at least 2 characters')
      .max(50, 'Organization name cannot exceed 50 characters')
      .optional()
      .openapi({ description: 'Optional initial organization name', example: 'Acme Cloud Services' }),
  })
  .openapi('RegisterInput');

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Zod schema for user login.
 */
export const LoginSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email address')
      .transform((val) => val.toLowerCase().trim())
      .openapi({ description: 'User email address', example: 'dev@s3forge.org' }),
    password: z
      .string()
      .min(1, 'Password is required')
      .openapi({ description: 'User password', example: 'SecurePassword123!' }),
  })
  .openapi('LoginInput');

export type LoginInput = z.infer<typeof LoginSchema>;
