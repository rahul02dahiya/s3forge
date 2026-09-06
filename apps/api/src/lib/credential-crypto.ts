import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '@s3forge/config';
import { AppError } from './app-error.js';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getEncryptionKey(): Buffer {
  const key = Buffer.from(env.s3Gateway.credentialEncryptionKey, 'base64');
  if (key.length !== 32) {
    throw AppError.internal('S3 credential encryption key must be a 32-byte base64 value');
  }
  return key;
}

/**
 * SigV4 requires reversible secret access because the server must recompute
 * the AWS HMAC signature. The UI still shows plaintext only once.
 */
export function encryptSecretKey(secretKey: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv, { authTagLength: TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(secretKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decryptSecretKey(payload: string): string {
  const [version, ivBase64, tagBase64, ciphertextBase64] = payload.split(':');
  if (version !== VERSION || !ivBase64 || !tagBase64 || !ciphertextBase64) {
    throw AppError.internal('Invalid encrypted S3 credential format');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivBase64, 'base64'),
    { authTagLength: TAG_BYTES },
  );
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
