import { s3CredentialRepository } from '../repositories/s3-credential.repository.js';
import { generateAccessKey, generateSecretKey, hashSecretKey } from '../lib/credential-generator.js';
import { auditService } from './audit.service.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';

export interface CreatedCredentialResult {
  id: number;
  organizationId: number;
  accessKey: string;
  secretKey: string; // Plaintext secret returned ONCE upon creation
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export class CredentialService {
  /**
   * Generate and persist a new S3 Access Key and Secret Key pair.
   * Note: The raw secretKey is returned in the result object ONCE. It is stored as a hash in DB.
   */
  async createCredential(
    organizationId: number,
    description?: string,
  ): Promise<CreatedCredentialResult> {
    const accessKey = generateAccessKey();
    const secretKey = generateSecretKey();
    const secretKeyHash = hashSecretKey(secretKey);

    const credential = await s3CredentialRepository.create({
      organizationId,
      accessKey,
      secretKeyHash,
      description,
    });

    logger.info({ credentialId: credential.id, organizationId }, 'Generated new S3 credential keypair');

    // Record Audit Event
    auditService.recordAudit({
      organizationId,
      action: 'credential.create',
      resourceType: 'credential',
      resourceId: String(credential.id),
      metadata: { accessKey: credential.accessKey, description },
    }).catch((err) => logger.warn({ err }, 'Failed to record audit log'));

    return {
      id: credential.id,
      organizationId: credential.organizationId,
      accessKey: credential.accessKey,
      secretKey, // Plaintext returned ONLY ONCE
      description: credential.description,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
    };
  }

  /**
   * List paginated S3 credentials for an organization.
   */
  async listCredentials(organizationId: number, page: number = 1, limit: number = 20) {
    const result = await s3CredentialRepository.findPaginatedByOrganization(
      organizationId,
      page,
      limit,
    );

    return {
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Get credential details by ID.
   */
  async getCredentialById(id: number, organizationId: number) {
    const credential = await s3CredentialRepository.findById(id, organizationId);
    if (!credential) {
      throw AppError.notFound('Credential not found');
    }

    const { secretKeyHash, ...safeCredential } = credential;
    return safeCredential;
  }

  /**
   * Toggle (enable or revoke) credential status.
   */
  async toggleCredentialStatus(id: number, organizationId: number, isActive: boolean = false) {
    const updated = await s3CredentialRepository.updateStatus(id, organizationId, isActive);
    if (!updated) {
      throw AppError.notFound('Credential not found');
    }

    logger.info(
      { id, organizationId, isActive },
      'Updated S3 credential status',
    );

    // Record Audit Event
    auditService.recordAudit({
      organizationId,
      action: isActive ? 'credential.enable' : 'credential.revoke',
      resourceType: 'credential',
      resourceId: String(updated.id),
      metadata: { accessKey: updated.accessKey, isActive },
    }).catch((err) => logger.warn({ err }, 'Failed to record audit log'));

    const { secretKeyHash, ...safeCredential } = updated;
    return safeCredential;
  }

  /**
   * Delete an S3 credential.
   */
  async deleteCredential(id: number, organizationId: number) {
    const deleted = await s3CredentialRepository.delete(id, organizationId);
    if (!deleted) {
      throw AppError.notFound('Credential not found');
    }

    logger.info({ id, organizationId }, 'Deleted S3 credential');

    // Record Audit Event
    auditService.recordAudit({
      organizationId,
      action: 'credential.delete',
      resourceType: 'credential',
      resourceId: String(deleted.id),
      metadata: { accessKey: deleted.accessKey },
    }).catch((err) => logger.warn({ err }, 'Failed to record audit log'));

    return true;
  }
}

export const credentialService = new CredentialService();
