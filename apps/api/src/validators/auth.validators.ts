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

/**
 * Zod schema for forgot password request.
 */
export const ForgotPasswordSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email address')
      .transform((val) => val.toLowerCase().trim())
      .openapi({ description: 'User email address', example: 'dev@s3forge.org' }),
  })
  .openapi('ForgotPasswordInput');

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * Zod schema for completing password reset.
 */
export const ResetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, 'Reset token is required')
      .openapi({ description: 'Password reset token from email link', example: 'a1b2c3d4e5f6...' }),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .openapi({ description: 'New password', example: 'NewSecurePassword123!' }),
  })
  .openapi('ResetPasswordInput');

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
