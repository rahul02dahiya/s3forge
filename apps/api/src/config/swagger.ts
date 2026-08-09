import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod schemas with openapi metadata methods (.openapi())
extendZodWithOpenApi(z);

export const openApiRegistry = new OpenAPIRegistry();

// Register Security Schemes
openApiRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT authorization header for authenticated user dashboard requests (Authorization: Bearer <token>)',
});

openApiRegistry.registerComponent('securitySchemes', 's3AccessKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'X-S3Forge-Access-Key',
  description: 'S3 Access Key header for programmatic access to S3Forge management APIs',
});

/**
 * Generates the complete OpenAPI 3.1.0 specification document.
 */
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(openApiRegistry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'S3Forge Management API',
      version: '1.0.0',
      description:
        'Open-source, self-hosted platform API for managing S3-compatible object storage powered by MinIO.',
      contact: {
        name: 'S3Forge Engineering Team',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'V1 API Base Server',
      },
    ],
  });
}
