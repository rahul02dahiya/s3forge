import { Router } from 'express';
import { credentialController } from '../controllers/credential.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  CreateCredentialSchema,
  CredentialIdParamSchema,
  ListCredentialsQuerySchema,
  CredentialResponseSchema,
  CredentialWithSecretResponseSchema,
  CredentialListResponseSchema,
} from '../validators/credential.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Paths for Credential Endpoints
openApiRegistry.registerPath({
  method: 'get',
  path: '/credentials',
  summary: 'List all S3 credentials for organization',
  tags: ['Credentials'],
  security: [{ bearerAuth: [] }],
  request: {
    query: ListCredentialsQuerySchema,
  },
  responses: {
    200: { 
      description: 'Paginated list of organization credentials',
      content: { 'application/json': { schema: CredentialListResponseSchema } }
    },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/credentials',
  summary: 'Create a new S3 access credential keypair',
  tags: ['Credentials'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateCredentialSchema },
      },
    },
  },
  responses: {
    201: { 
      description: 'Credential keypair created successfully (secret key returned ONCE)',
      content: { 'application/json': { schema: CredentialWithSecretResponseSchema } }
    },
    400: { description: 'Validation error' },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/credentials/{id}',
  summary: 'Get S3 credential details by ID',
  tags: ['Credentials'],
  security: [{ bearerAuth: [] }],
  request: {
    params: CredentialIdParamSchema,
  },
  responses: {
    200: { 
      description: 'Credential details',
      content: { 'application/json': { schema: CredentialResponseSchema } }
    },
    404: { description: 'Credential not found' },
  },
});

openApiRegistry.registerPath({
  method: 'patch',
  path: '/credentials/{id}/revoke',
  summary: 'Revoke (deactivate) an S3 credential keypair',
  tags: ['Credentials'],
  security: [{ bearerAuth: [] }],
  request: {
    params: CredentialIdParamSchema,
  },
  responses: {
    200: { 
      description: 'Credential revoked successfully',
      content: { 'application/json': { schema: CredentialResponseSchema } }
    },
    404: { description: 'Credential not found' },
  },
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/credentials/{id}',
  summary: 'Delete an S3 credential keypair',
  tags: ['Credentials'],
  security: [{ bearerAuth: [] }],
  request: {
    params: CredentialIdParamSchema,
  },
  responses: {
    200: { description: 'Credential deleted successfully' },
    404: { description: 'Credential not found' },
  },
});

// Route Definitions
router.use(validate({}), (req, res, next) => {
  // Use authenticate middleware with allowAccessKey: false for all credential routes
  authenticate({ allowAccessKey: false })(req, res, next);
});

router.get(
  '/',
  validate({ query: ListCredentialsQuerySchema }),
  (req, res, next) => credentialController.listCredentials(req, res).catch(next),
);

router.post(
  '/',
  validate({ body: CreateCredentialSchema }),
  (req, res, next) => credentialController.createCredential(req, res).catch(next),
);

router.get(
  '/:id',
  validate({ params: CredentialIdParamSchema }),
  (req, res, next) => credentialController.getCredential(req, res).catch(next),
);

router.patch(
  '/:id/revoke',
  validate({ params: CredentialIdParamSchema }),
  (req, res, next) => credentialController.revokeCredential(req, res).catch(next),
);

router.delete(
  '/:id',
  validate({ params: CredentialIdParamSchema }),
  (req, res, next) => credentialController.deleteCredential(req, res).catch(next),
);

export default router;
