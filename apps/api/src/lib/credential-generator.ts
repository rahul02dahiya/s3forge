import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Utility functions for generating and hashing S3 Access Keys and Secret Keys.
 */

/**
 * Generates a cryptographically secure 20-character Access Key ID.
 * Example format: 'S3F' + 17 random uppercase alphanumeric characters.
 */
export function generateAccessKey(): string {
  const prefix = 'S3F';
  const randomChars = randomBytes(15)
    .toString('base64')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 17);
  return `${prefix}${randomChars}`;
}

/**
 * Generates a cryptographically secure 40-character Secret Access Key.
 */
export function generateSecretKey(): string {
  return randomBytes(30).toString('base64').slice(0, 40);
}

/**
 * Hashes a secret key using SHA-256 for secure database storage.
 */
export function hashSecretKey(secretKey: string): string {
  return createHash('sha256').update(secretKey).digest('hex');
}

/**
 * Safely verifies a plain secret key against a stored SHA-256 hash using timing-safe comparison.
 */
export function verifySecretKey(secretKey: string, storedHash: string): boolean {
  const inputHash = hashSecretKey(secretKey);
  const inputBuffer = Buffer.from(inputHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (inputBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, storedBuffer);
}
