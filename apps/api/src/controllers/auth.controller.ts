import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../lib/response.js';
import { AppError } from '../lib/app-error.js';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../validators/auth.validators.js';

/**
 * Controller handling user registration, authentication, and session management.
 */
export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    const input: RegisterInput = req.body;
    const result = await authService.register(input, req);

    sendSuccess(res, result, 'User registered successfully', 201);
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    const input: LoginInput = req.body;
    const result = await authService.login(input, req);

    sendSuccess(res, result, 'Login successful', 200);
  }

  /**
   * GET /api/v1/auth/me
   */
  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const result = await authService.getMe(req.user.userId);
    sendSuccess(res, result, 'Current user profile retrieved', 200);
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email }: ForgotPasswordInput = req.body;
    const result = await authService.forgotPassword(email, req);

    sendSuccess(res, result, result.message, 200);
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword }: ResetPasswordInput = req.body;
    const result = await authService.resetPassword(token, newPassword, req);

    sendSuccess(res, result, result.message, 200);
  }
}

export const authController = new AuthController();
