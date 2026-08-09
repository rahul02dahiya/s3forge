/**
 * Custom application error with HTTP status code and machine-readable error code.
 * Thrown by services/controllers, caught by the global error handler middleware.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: Record<string, string>[];

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    errors?: Record<string, string>[],
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;

    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: Record<string, string>[]): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', errors);
  }

  static notFound(message: string): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  static internal(message: string): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}
