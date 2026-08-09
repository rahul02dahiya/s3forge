import { Router } from 'express';
import { credentialController } from '../controllers/credential.controller.js';
import { validate } from '../middleware/validate.js';
import {
  CreateCredentialSchema,
  CredentialIdParamSchema,
  ListCredentialsQuerySchema,
} from '../validators/credential.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Paths for Credential Endpoints
openApiRegistry.registerPath({
  method: 'get',
  path: '/credentials',
  summary: 'List all S3 credentials for organization',
  tags: ['Credentials'],
  request: {
    query: ListCredentialsQuerySchema,
  },
  responses: {
    200: { description: 'Paginated list of organization credentials' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/credentials',
  summary: 'Create a new S3 access credential keypair',
  tags: ['Credentials'],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateCredentialSchema },
      },
    },
  },
  responses: {
    201: { description: 'Credential keypair created successfully (secret key returned ONCE)' },
    400: { description: 'Validation error' },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/credentials/{id}',
  summary: 'Get S3 credential details by ID',
  tags: ['Credentials'],
  request: {
    params: CredentialIdParamSchema,
  },
  responses: {
    200: { description: 'Credential details' },
    404: { description: 'Credential not found' },
  },
});

openApiRegistry.registerPath({
  method: 'patch',
  path: '/credentials/{id}/revoke',
  summary: 'Revoke (deactivate) an S3 credential keypair',
  tags: ['Credentials'],
  request: {
    params: CredentialIdParamSchema,
  },
  responses: {
    200: { description: 'Credential revoked successfully' },
    404: { description: 'Credential not found' },
  },
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/credentials/{id}',
  summary: 'Delete an S3 credential keypair',
  tags: ['Credentials'],
  request: {
    params: CredentialIdParamSchema,
  },
  responses: {
    200: { description: 'Credential deleted successfully' },
    404: { description: 'Credential not found' },
  },
});

// Route Definitions
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
