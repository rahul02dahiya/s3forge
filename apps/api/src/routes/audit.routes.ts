import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { ListAuditLogsQuerySchema } from '../validators/audit.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Path for Audit Logs Endpoint
openApiRegistry.registerPath({
  method: 'get',
  path: '/audit-logs',
  summary: 'Get paginated audit log entries for organization',
  tags: ['Audit Logs'],
  security: [{ bearerAuth: [] }, { s3AccessKeyAuth: [] }],
  request: {
    query: ListAuditLogsQuerySchema,
  },
  responses: {
    200: { description: 'Paginated audit log records' },
    401: { description: 'Unauthorized' },
  },
});

// Route Definition
router.get(
  '/',
  authenticate({ optional: true }),
  validate({ query: ListAuditLogsQuerySchema }),
  (req, res, next) => auditController.listAuditLogs(req, res).catch(next),
);

export default router;
