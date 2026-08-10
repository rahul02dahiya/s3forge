import type { Request, Response } from 'express';
import { credentialService } from '../services/credential.service.js';
import { sendSuccess } from '../lib/response.js';
import type {
  CreateCredentialInput,
  ListCredentialsQueryInput,
} from '../validators/credential.validators.js';

/**
 * Controller handling S3 credential keypair management.
 */
export class CredentialController {
  /**
   * POST /api/v1/credentials
   */
  async createCredential(req: Request, res: Response): Promise<void> {
    const input: CreateCredentialInput = req.body;
    const credential = await credentialService.createCredential(1, input.description);

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
    const query = req.query as unknown as ListCredentialsQueryInput;
    const { data, meta } = await credentialService.listCredentials(1, query.page, query.limit);

    sendSuccess(res, data, 'Credentials retrieved successfully', 200, meta);
  }

  /**
   * GET /api/v1/credentials/:id
   */
  async getCredential(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const credential = await credentialService.getCredentialById(id, 1);

    sendSuccess(res, credential, 'Credential retrieved successfully', 200);
  }

  /**
   * PATCH /api/v1/credentials/:id/revoke
   */
  async revokeCredential(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const credential = await credentialService.toggleCredentialStatus(id, 1, false);

    sendSuccess(res, credential, 'Credential revoked successfully', 200);
  }

  /**
   * DELETE /api/v1/credentials/:id
   */
  async deleteCredential(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    await credentialService.deleteCredential(id, 1);

    sendSuccess(res, null, 'Credential deleted successfully', 200);
  }
}

export const credentialController = new CredentialController();
