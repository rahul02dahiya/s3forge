import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { docsRoutes } from './docs.routes.js';
import storageRoutes from './storage.routes.js';
import credentialRoutes from './credential.routes.js';

const router = Router();

// System endpoints
router.use('/', healthRoutes);
router.use('/', docsRoutes);

// Feature endpoints
router.use('/storage', storageRoutes);
router.use('/credentials', credentialRoutes);

export { router as apiRouter };
