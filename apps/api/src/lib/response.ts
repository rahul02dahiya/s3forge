import type { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

/**
 * Send a standardized success response.
 */
export function sendSuccess(
  res: Response,
  data: unknown,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: PaginationMeta,
): void {
  const body: Record<string, unknown> = {
    status: 'success',
    message,
    data,
  };

  if (meta) {
    body.meta = meta;
  }

  res.status(statusCode).json(body);
}

/**
 * Send a standardized error response.
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  errors?: Record<string, string>[],
): void {
  const body: Record<string, unknown> = {
    status: 'error',
    message,
    code,
  };

  if (errors && errors.length > 0) {
    body.errors = errors;
  }

  res.status(statusCode).json(body);
}
