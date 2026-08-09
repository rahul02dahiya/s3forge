import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { RegisterSchema, LoginSchema } from '../validators/auth.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Register OpenAPI Paths for Auth Endpoints
openApiRegistry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  summary: 'Register a new user account and organization',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': { schema: RegisterSchema },
      },
    },
  },
  responses: {
    201: { description: 'User registered successfully with JWT access token' },
    400: { description: 'Validation error' },
    409: { description: 'Email already registered' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  summary: 'Authenticate user credentials and receive JWT access token',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': { schema: LoginSchema },
      },
    },
  },
  responses: {
    200: { description: 'Login successful' },
    401: { description: 'Invalid email or password' },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  summary: 'Get details of currently authenticated user and organization',
  tags: ['Authentication'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: 'User profile retrieved successfully' },
    401: { description: 'Unauthorized' },
  },
});

// Route Definitions
router.post(
  '/register',
  validate({ body: RegisterSchema }),
  (req, res, next) => authController.register(req, res).catch(next),
);

router.post(
  '/login',
  validate({ body: LoginSchema }),
  (req, res, next) => authController.login(req, res).catch(next),
);

router.get(
  '/me',
  authenticate(),
  (req, res, next) => authController.me(req, res).catch(next),
);

export default router;
