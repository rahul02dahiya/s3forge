import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { 
  ListAuditLogsQuerySchema,
  AuditLogListResponseSchema 
} from '../validators/audit.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Path for Audit Logs Endpoint
openApiRegistry.registerPath({
  method: 'get',
  path: '/audit-logs',
  summary: 'Get paginated audit log entries for organization',
  tags: ['Audit Logs'],
  security: [{ bearerAuth: [] }],
  request: {
    query: ListAuditLogsQuerySchema,
  },
  responses: {
    200: { 
      description: 'Paginated audit log records',
      content: { 'application/json': { schema: AuditLogListResponseSchema } }
    },
    401: { description: 'Unauthorized' },
  },
});

// Route Definition
router.get(
  '/',
  authenticate({ allowAccessKey: false }),
  validate({ query: ListAuditLogsQuerySchema }),
  (req, res, next) => auditController.listAuditLogs(req, res).catch(next),
);

export default router;
