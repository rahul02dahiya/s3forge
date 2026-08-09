import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { constants } from '@s3forge/config';

/**
 * Secure password hashing and verification using Node.js native crypto scrypt.
 */

/**
 * Hashes a plaintext password using scrypt with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(constants.AUTH.PASSWORD_SALT_BYTES).toString('hex');
  const derivedKey = scryptSync(password, salt, constants.AUTH.PASSWORD_KEY_LEN);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash string (salt:hash).
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) {
    return false;
  }

  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = scryptSync(password, salt, constants.AUTH.PASSWORD_KEY_LEN);

  if (keyBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(keyBuffer, derivedKey);
}
