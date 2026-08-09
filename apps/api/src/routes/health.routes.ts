import { Router } from 'express';
import { healthCheck, readinessCheck } from '../controllers/health.controller.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/ready', readinessCheck);

export { router as healthRoutes };
