import app from './app.js';
import { env, constants } from '@s3forge/config';
import { logger } from './lib/logger.js';
import { db } from './config/database.js';
import { snapshotWorker } from './workers/snapshot-worker.js';
import { sql } from 'drizzle-orm';
import type { Server } from 'node:http';

const SHUTDOWN_TIMEOUT_MS = constants.SERVER.SHUTDOWN_TIMEOUT_MS;
const MAX_RETRIES = constants.SERVER.DB_CONNECT_MAX_RETRIES;
const BASE_DELAY_MS = constants.SERVER.DB_CONNECT_BASE_DELAY_MS;

/**
 * Attempts to connect to PostgreSQL with exponential backoff.
 * If all retries are exhausted, the process exits.
 */
async function connectWithRetry(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await db.execute(sql`SELECT 1`);
      logger.info('Connected to PostgreSQL');
      return;
    } catch (error) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);

      if (attempt === MAX_RETRIES) {
        logger.fatal({ err: error }, 'Failed to connect to PostgreSQL after all retries');
        process.exit(1);
      }

      logger.warn(
        { attempt, maxRetries: MAX_RETRIES, nextRetryMs: delay },
        `PostgreSQL connection failed, retrying in ${delay}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Gracefully shuts down the HTTP server, background workers, and database connections.
 */
function gracefulShutdown(server: Server, signal: string): void {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

  // Stop background workers
  snapshotWorker.stop();

  // Force exit if shutdown takes too long
  const forceTimeout = setTimeout(() => {
    logger.fatal('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  // Don't let the timeout keep the process alive if everything else finishes
  forceTimeout.unref();

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

/**
 * Bootstrap the application.
 */
async function start(): Promise<void> {
  // Ensure database is reachable before accepting traffic
  await connectWithRetry();

  // Start background worker for usage snapshotting
  snapshotWorker.start();

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, `S3Forge API listening on port ${env.port}`);
  });

  // Register shutdown handlers
  process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    gracefulShutdown(server, 'unhandledRejection');
  });
}

start();
