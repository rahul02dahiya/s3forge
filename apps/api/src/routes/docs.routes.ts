import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from '../config/swagger.js';

const router = Router();

// Raw OpenAPI JSON specification endpoint
router.get('/openapi.json', (_req, res) => {
  const spec = generateOpenApiDocument();
  res.setHeader('Content-Type', 'application/json');
  res.json(spec);
});

// Interactive Swagger UI endpoint
router.use('/docs', swaggerUi.serve, (req: any, res: any, next: any) => {
  const spec = generateOpenApiDocument();
  swaggerUi.setup(spec)(req, res, next);
});

export { router as docsRoutes };
