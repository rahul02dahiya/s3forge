import type { Request } from 'express';
import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signJwt } from '../lib/jwt.js';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';
import { constants } from '@s3forge/config';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import type { RegisterInput, LoginInput } from '../validators/auth.validators.js';

export class AuthService {
  /**
   * Register a new user and generate access token.
   */
  async register(input: RegisterInput, req?: Request) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const passwordHash = hashPassword(input.password);
    const { user, organization } = await userRepository.createUserWithOrganization(
      {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
      },
      input.organizationName,
    );

    const token = signJwt({
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      role: 'owner',
    });

    logger.info({ userId: user.id, organizationId: organization.id }, 'Registered new user');

    // Send Welcome Email asynchronously
    emailService.sendWelcomeEmail(user.email, user.displayName).catch((err) => {
      logger.error({ err, userId: user.id }, 'Failed to send welcome email');
    });

    // Record Audit Event
    auditService.recordAudit({
      req,
      organizationId: organization.id,
      userId: user.id,
      action: 'user.register',
      resourceType: 'user',
      resourceId: String(user.id),
      metadata: { email: user.email, displayName: user.displayName },
    }).catch(() => { });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      token,
    };
  }

  /**
   * Authenticate user credentials and return access token.
   */
  async login(input: LoginInput, req?: Request) {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email address or password');
    }

    const isValidPassword = verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.unauthorized('Invalid email address or password');
    }

    const org = await userRepository.getUserOrganization(user.id);
    if (!org) {
      throw AppError.forbidden('User account is not associated with any organization');
    }
    const organizationId = org.organizationId;
    const role = org.role;

    const token = signJwt({
      userId: user.id,
      email: user.email,
      organizationId,
      role,
    });

    logger.info({ userId: user.id, organizationId }, 'User logged in successfully');

    // Record Audit Event
    auditService.recordAudit({
      req,
      organizationId,
      userId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: String(user.id),
      metadata: { email: user.email },
    }).catch(() => { });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      organization: org
        ? { id: org.organizationId, name: org.name, slug: org.slug, role: org.role }
        : null,
      token,
    };
  }

  /**
   * Fetch current authenticated user details.
   */
  async getMe(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.notFound('User not found');
    }

    const org = await userRepository.getUserOrganization(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      organization: org
        ? { id: org.organizationId, name: org.name, slug: org.slug, role: org.role }
        : null,
    };
  }

  /**
   * Initiate password reset process by generating a token and sending email.
   * Always returns success message to avoid email enumeration.
   */
  async forgotPassword(email: string, _req?: Request) {
    const user = await userRepository.findByEmail(email);

    if (user && user.isActive) {
      // Generate 32-byte secure random token
      const rawToken = crypto.randomBytes(32).toString('hex');

      // Hash token before storing in database (SHA-256)
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Expiration: 1 hour (or from constants)
      const expirySeconds = constants.MAIL.RESET_TOKEN_EXPIRY_SECONDS || 3600;
      const expiresAt = new Date(Date.now() + expirySeconds * 1000);

      // Save token hash in DB
      await userRepository.saveResetToken(user.id, tokenHash, expiresAt);

      // Send password reset email asynchronously
      emailService.sendPasswordResetEmail(user.email, rawToken, user.displayName).catch((err) => {
        logger.error({ err, userId: user.id }, 'Failed to send password reset email');
      });

      logger.info({ userId: user.id }, 'Generated password reset token');
    } else {
      logger.info({ email }, 'Password reset requested for non-existent or inactive email');
    }

    return {
      message: 'If an account with that email address exists, a password reset link has been sent.',
    };
  }

  /**
   * Complete password reset process using raw token.
   */
  async resetPassword(token: string, newPassword: string, req?: Request) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await userRepository.findByResetTokenHash(tokenHash);

    if (!user || !user.isActive) {
      throw AppError.badRequest('Invalid or expired password reset token');
    }

    const newPasswordHash = hashPassword(newPassword);
    await userRepository.updatePasswordAndClearResetToken(user.id, newPasswordHash);

    logger.info({ userId: user.id }, 'Password reset completed successfully');

    // Audit log
    const org = await userRepository.getUserOrganization(user.id);
    if (org) {
      auditService.recordAudit({
        req,
        organizationId: org.organizationId,
        userId: user.id,
        action: 'user.password_reset',
        resourceType: 'user',
        resourceId: String(user.id),
      }).catch(() => { });
    }

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}

export const authService = new AuthService();
