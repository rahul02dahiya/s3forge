import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { docsRoutes } from './docs.routes.js';
import authRoutes from './auth.routes.js';
import storageRoutes from './storage.routes.js';
import credentialRoutes from './credential.routes.js';
import auditRoutes from './audit.routes.js';

const router = Router();

// System endpoints
router.use('/', healthRoutes);
router.use('/', docsRoutes);

// Feature endpoints
router.use('/auth', authRoutes);
router.use('/storage', storageRoutes);
router.use('/credentials', credentialRoutes);
router.use('/audit-logs', auditRoutes);

export { router as apiRouter };
