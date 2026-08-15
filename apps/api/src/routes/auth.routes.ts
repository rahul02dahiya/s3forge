import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { constants } from '@s3forge/config';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../validators/auth.validators.js';
import { openApiRegistry } from '../config/swagger.js';

const router = Router();

// Strict rate limiters for sensitive endpoints (driven by constants)
const forgotPasswordLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.FORGOT_PASSWORD_WINDOW_MS,
  limit: constants.RATE_LIMIT.FORGOT_PASSWORD_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset requests from this IP. Please try again after 15 minutes.',
    },
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.RESET_PASSWORD_WINDOW_MS,
  limit: constants.RATE_LIMIT.RESET_PASSWORD_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset attempts. Please try again after 15 minutes.',
    },
  },
});

// Register OpenAPI Paths for Auth Endpoints
openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/register',
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
  path: '/auth/login',
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
  path: '/auth/me',
  summary: 'Get details of currently authenticated user and organization',
  tags: ['Authentication'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'User profile retrieved successfully' },
    401: { description: 'Unauthorized' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/forgot-password',
  summary: 'Initiate password reset request by sending email link',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': { schema: ForgotPasswordSchema },
      },
    },
  },
  responses: {
    200: { description: 'Password reset email triggered if account exists' },
    429: { description: 'Too many requests' },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/reset-password',
  summary: 'Complete password reset using valid email reset token',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': { schema: ResetPasswordSchema },
      },
    },
  },
  responses: {
    200: { description: 'Password reset completed successfully' },
    400: { description: 'Invalid or expired reset token' },
    429: { description: 'Too many requests' },
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

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: ForgotPasswordSchema }),
  (req, res, next) => authController.forgotPassword(req, res).catch(next),
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate({ body: ResetPasswordSchema }),
  (req, res, next) => authController.resetPassword(req, res).catch(next),
);

export default router;
