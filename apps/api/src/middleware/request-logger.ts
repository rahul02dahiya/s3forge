import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger.js';

/**
 * HTTP request/response logging middleware using pino-http.
 * Logs every request with method, url, status, and response time.
 * Attaches a child logger to req.log with the request's correlation ID.
 */
export const requestLogger = pinoHttp({
  logger,

  // Use the request ID set by our requestId middleware
  genReqId: (req) => (req as Express.Request).id,

  // Customize what gets logged from the request
  customProps: (req) => ({
    requestId: (req as Express.Request).id,
  }),

  // Don't log health check endpoints to avoid noise
  autoLogging: {
    ignore: (req) => {
      const url = req.url ?? '';
      return url === '/api/v1/health';
    },
  },

  // Customize the log level based on response status code
  customLogLevel: (_req, res, error) => {
    if (error || (res.statusCode && res.statusCode >= 500)) {
      return 'error';
    }
    if (res.statusCode && res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },

  // Customize the success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },

  // Customize the error message
  customErrorMessage: (req, _res, error) => {
    return `${req.method} ${req.url} errored: ${error.message}`;
  },
});
