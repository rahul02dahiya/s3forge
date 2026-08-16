import type { Request, Response } from 'express';
import { credentialService } from '../services/credential.service.js';
import { sendSuccess } from '../lib/response.js';
import { AppError } from '../lib/app-error.js';
import type {
  CreateCredentialInput,
  ListCredentialsQueryInput,
} from '../validators/credential.validators.js';

/**
 * Controller handling S3 credential keypair management.
 */
export class CredentialController {
  private getOrgId(req: Request): number {
    const orgId = req.organizationId;
    if (!orgId) {
      throw AppError.unauthorized('Organization contextual scope required');
    }
    return orgId;
  }

  /**
   * POST /api/v1/credentials
   */
  async createCredential(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const input: CreateCredentialInput = req.body;
    const credential = await credentialService.createCredential(orgId, input.description);

    sendSuccess(
      res,
      credential,
      'S3 credential keypair created successfully. Store the secret key securely — it will not be shown again.',
      201,
    );
  }

  /**
   * GET /api/v1/credentials
   */
  async listCredentials(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const query = req.query as unknown as ListCredentialsQueryInput;
    const { data, meta } = await credentialService.listCredentials(orgId, query.page, query.limit);

    sendSuccess(res, data, 'Credentials retrieved successfully', 200, meta);
  }

  /**
   * GET /api/v1/credentials/:id
   */
  async getCredential(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const id = Number(req.params.id);
    const credential = await credentialService.getCredentialById(id, orgId);

    sendSuccess(res, credential, 'Credential retrieved successfully', 200);
  }

  /**
   * PATCH /api/v1/credentials/:id/revoke
   */
  async revokeCredential(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const id = Number(req.params.id);
    const credential = await credentialService.toggleCredentialStatus(id, orgId, false);

    sendSuccess(res, credential, 'Credential revoked successfully', 200);
  }

  /**
   * DELETE /api/v1/credentials/:id
   */
  async deleteCredential(req: Request, res: Response): Promise<void> {
    const orgId = this.getOrgId(req);
    const id = Number(req.params.id);
    await credentialService.deleteCredential(id, orgId);

    sendSuccess(res, null, 'Credential deleted successfully', 200);
  }
}

export const credentialController = new CredentialController();
