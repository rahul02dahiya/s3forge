import pino from 'pino';
import { env } from '@s3forge/config';

const isProduction = env.nodeEnv === 'production';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',

  // Structured JSON in production, pretty-ish in dev via pino-pretty (if installed)
  transport: isProduction
    ? undefined
    : { target: 'pino/file', options: { destination: 1 } },

  // Redact sensitive fields from all log output
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.secretKey',
      '*.password',
      '*.secret',
      '*.token',
      '*.secretKey',
      '*.passwordHash',
    ],
    censor: '[REDACTED]',
  },

  // ISO timestamp for structured log aggregation
  timestamp: pino.stdTimeFunctions.isoTime,

  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
});

/**
 * Creates a child logger with additional context bound to every log entry.
 * Useful for adding requestId, service name, or operation context.
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}
