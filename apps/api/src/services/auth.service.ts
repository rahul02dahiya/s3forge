import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signJwt } from '../lib/jwt.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import type { RegisterInput, LoginInput } from '../validators/auth.validators.js';

export class AuthService {
  /**
   * Register a new user and generate access token.
   */
  async register(input: RegisterInput) {
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
    });

    logger.info({ userId: user.id, organizationId: organization.id }, 'Registered new user');

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
  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email address or password');
    }

    const isValidPassword = verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.unauthorized('Invalid email address or password');
    }

    const org = await userRepository.getUserOrganization(user.id);
    const organizationId = org?.organizationId ?? 1;

    const token = signJwt({
      userId: user.id,
      email: user.email,
      organizationId,
    });

    logger.info({ userId: user.id, organizationId }, 'User logged in successfully');

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
}

export const authService = new AuthService();
