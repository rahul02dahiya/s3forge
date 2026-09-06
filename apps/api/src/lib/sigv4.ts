import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { env } from '@s3forge/config';
import { bucketRepository } from '../repositories/bucket.repository.js';
import { s3Errors } from './s3-errors.js';

interface ParsedAuthorization {
  accessKey: string;
  credentialScope: string;
  signedHeaders: string[];
  signature: string;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function parseAuthorization(header: string): ParsedAuthorization {
  if (!header.startsWith('AWS4-HMAC-SHA256 ')) {
    throw s3Errors.accessDenied();
  }

  const parts = new Map<string, string>();
  for (const part of header.slice('AWS4-HMAC-SHA256 '.length).split(',')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey && rawValue.length > 0) {
      parts.set(rawKey, rawValue.join('='));
    }
  }

  const credential = parts.get('Credential');
  const signedHeaders = parts.get('SignedHeaders');
  const signature = parts.get('Signature');
  if (!credential || !signedHeaders || !signature) {
    throw s3Errors.signatureDoesNotMatch();
  }

  const [accessKey, ...scopeParts] = credential.split('/');
  if (!accessKey || scopeParts.length !== 4) {
    throw s3Errors.signatureDoesNotMatch();
  }

  return {
    accessKey,
    credentialScope: scopeParts.join('/'),
    signedHeaders: signedHeaders.split(';').map((headerName) => headerName.toLowerCase()),
    signature,
  };
}

function getHeader(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value.join(',');
  return value ?? '';
}

function canonicalUri(req: Request): string {
  const path = req.originalUrl.split('?')[0] || '/';
  return path
    .split('/')
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)).replace(/%2F/g, '/'))
    .join('/');
}

function canonicalQuery(req: Request): string {
  const rawQuery = req.originalUrl.split('?')[1] ?? '';
  if (!rawQuery) return '';

  return rawQuery
    .split('&')
    .filter((part) => part.length > 0)
    .map((part) => {
      const [rawKey, rawValue = ''] = part.split('=');
      return [
        encodeURIComponent(decodeURIComponent(rawKey)),
        encodeURIComponent(decodeURIComponent(rawValue)),
      ] as const;
    })
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    ))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function canonicalHeaders(req: Request, signedHeaders: string[]): string {
  return signedHeaders
    .map((headerName) => {
      const value = getHeader(req, headerName).trim().replace(/\s+/g, ' ');
      if (!value) {
        throw s3Errors.signatureDoesNotMatch();
      }
      return `${headerName}:${value}\n`;
    })
    .join('');
}

function payloadHash(req: Request): string {
  return getHeader(req, 'x-amz-content-sha256') || 'UNSIGNED-PAYLOAD';
}

function assertFreshRequest(amzDate: string): void {
  const match = amzDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) {
    throw s3Errors.accessDenied();
  }

  const [, year, month, day, hour, minute, second] = match;
  const requestTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const skewMs = Math.abs(Date.now() - requestTime);
  if (skewMs > 15 * 60 * 1000) {
    throw s3Errors.accessDenied();
  }
}

function signingKey(secretKey: string, date: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function timingSafeHexEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function getSigV4AccessKey(req: Request): string {
  return parseAuthorization(getHeader(req, 'authorization')).accessKey;
}

export async function verifySigV4Request(req: Request, secretKey: string): Promise<void> {
  const parsed = parseAuthorization(getHeader(req, 'authorization'));
  const amzDate = getHeader(req, 'x-amz-date');
  assertFreshRequest(amzDate);

  const [date, region, service, terminal] = parsed.credentialScope.split('/');
  if (terminal !== 'aws4_request' || service !== 's3') {
    throw s3Errors.signatureDoesNotMatch();
  }

  // Determine expected region: prefer bucket-specific region when available.
  let expectedRegion = env.s3Gateway.region;

  try {
    // Try virtual-hosted-style: bucket.host.example -> bucket is first label
    const host = getHeader(req, 'host').split(':')[0];
    const hostParts = host.split('.');
    let possibleBucket = '';

    if (hostParts.length >= 3) {
      // e.g. bucket.s3forge.local or bucket.minio.local
      possibleBucket = hostParts[0];
    } else {
      // Fallback to path-style: first segment of the path
      const path = req.originalUrl.split('?')[0] || '/';
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        possibleBucket = segments[0];
      }
    }

    if (possibleBucket) {
      // Attempt to find bucket by internal minio name (used for routing)
      const bucketRecord = await bucketRepository.findByMinioName(possibleBucket);
      if (bucketRecord && bucketRecord.region) {
        expectedRegion = bucketRecord.region;
      }
    }
  } catch (err) {
    // ignore and fall back to env region
  }

  if (region !== expectedRegion) {
    throw s3Errors.signatureDoesNotMatch();
  }

  const canonicalRequest = [
    req.method.toUpperCase(),
    canonicalUri(req),
    canonicalQuery(req),
    canonicalHeaders(req, parsed.signedHeaders),
    parsed.signedHeaders.join(';'),
    payloadHash(req),
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    parsed.credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const expectedSignature = createHmac('sha256', signingKey(secretKey, date, region, service))
    .update(stringToSign, 'utf8')
    .digest('hex');

  if (!timingSafeHexEqual(expectedSignature, parsed.signature)) {
    throw s3Errors.signatureDoesNotMatch();
  }
}
