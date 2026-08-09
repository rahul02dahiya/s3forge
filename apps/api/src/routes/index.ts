import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import storageRoutes from './storage.routes.js';

const router = Router();

// System endpoints
router.use('/', healthRoutes);

// Storage endpoints
router.use('/storage', storageRoutes);

export { router as apiRouter };
