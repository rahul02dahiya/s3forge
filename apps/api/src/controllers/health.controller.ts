import type { Request, Response } from 'express';
import { db } from '../config/database.js';
import { minio } from '../config/minio.js';
import { sql } from 'drizzle-orm';
import { sendSuccess, sendError } from '../lib/response.js';
import { logger } from '../lib/logger.js';

/**
 * Health check endpoint — returns 200 if process, PostgreSQL, and MinIO are healthy.
 * Returns 503 if any dependency is unreachable.
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, unknown> = {
    uptime: process.uptime(),
  };
  let healthy = true;

  // Check PostgreSQL
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.postgres = `healthy (${Date.now() - start}ms)`;
  } catch (error) {
    checks.postgres = 'unreachable';
    healthy = false;
    logger.error({ err: error }, 'Health check: PostgreSQL unreachable');
  }

  // Check MinIO
  try {
    const start = Date.now();
    await minio.listBuckets();
    checks.minio = `healthy (${Date.now() - start}ms)`;
  } catch (error) {
    checks.minio = 'unreachable';
    healthy = false;
    logger.error({ err: error }, 'Health check: MinIO unreachable');
  }

  if (healthy) {
    sendSuccess(res, checks, 'Service is healthy');
  } else {
    sendError(res, 'One or more services are unavailable', 503, 'SERVICE_UNAVAILABLE');
  }
}
