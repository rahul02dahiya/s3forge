import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../lib/app-error.js';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Creates a validation middleware from Zod schemas.
 * Validates request body, params, and/or query against the provided schemas.
 * On success, replaces req properties with the parsed (and transformed) values.
 * On failure, throws an AppError with field-level error details.
 *
 * Usage:
 *   router.post('/buckets', validate({ body: CreateBucketSchema }), controller.create);
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string>[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        errors.push(...formatZodErrors(result.error, 'body'));
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        // Attach parsed params back — keeps type safety
        Object.assign(req.params, result.data);
      } else {
        errors.push(...formatZodErrors(result.error, 'params'));
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        Object.assign(req.query, result.data);
      } else {
        errors.push(...formatZodErrors(result.error, 'query'));
      }
    }

    if (errors.length > 0) {
      throw AppError.badRequest('Validation failed', errors);
    }

    next();
  };
}

/**
 * Converts Zod validation errors into a flat array of field-level error objects.
 */
function formatZodErrors(
  error: ZodError,
  source: string,
): Record<string, string>[] {
  return error.issues.map((issue) => ({
    field: `${source}.${issue.path.join('.')}`,
    message: issue.message,
  }));
}
