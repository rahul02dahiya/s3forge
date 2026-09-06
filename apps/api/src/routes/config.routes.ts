import { Router } from 'express';
import { env } from '@s3forge/config';

const router = Router();

/**
 * Public runtime config (safe to expose non-sensitive values)
 */
router.get('/', (_req, res) => {
  res.json({
    s3Gateway: {
      region: env.s3Gateway.region,
      basePath: env.s3Gateway.basePath,
    },
  });
});

export default router;
