import type { Request, Response } from 'express';
import { db } from '../config/database.js';
import { minio } from '../config/minio.js';
import { sql } from 'drizzle-orm';
import { sendSuccess, sendError } from '../lib/response.js';
import { logger } from '../lib/logger.js';

/**
 * Liveness probe — returns 200 if the process is running.
 * Does NOT check external dependencies. Used by container orchestrators
 * to determine if the process needs to be restarted.
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, { uptime: process.uptime() }, 'Service is alive');
}

/**
 * Readiness probe — returns 200 only if PostgreSQL AND MinIO are reachable.
 * Used by load balancers to determine if the instance can serve traffic.
 * Returns 503 if any dependency is unavailable.
 */
export async function readinessCheck(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Check PostgreSQL
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const duration = Date.now() - start;
    checks.postgres = `healthy (${duration}ms)`;
  } catch (error) {
    checks.postgres = 'unreachable';
    healthy = false;
    logger.error({ err: error }, 'Readiness check: PostgreSQL unreachable');
  }

  // Check MinIO
  try {
    const start = Date.now();
    await minio.listBuckets();
    const duration = Date.now() - start;
    checks.minio = `healthy (${duration}ms)`;
  } catch (error) {
    checks.minio = 'unreachable';
    healthy = false;
    logger.error({ err: error }, 'Readiness check: MinIO unreachable');
  }

  if (healthy) {
    sendSuccess(res, checks, 'All services are ready');
  } else {
    sendError(res, 'One or more services are unavailable', 503, 'SERVICE_UNAVAILABLE');
  }
}
