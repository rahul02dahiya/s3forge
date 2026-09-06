import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';

import { verifySecretKey } from './credential-generator.js';
import { verifySigV4Request } from './sigv4.js';

function buildSignedRequest(secretKey: string) {
  const accessKey = 'AKIDEXAMPLE';
  const region = 'us-east-1';
  const service = 's3';
  const amzDate = new Date(Date.now() - 60_000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash('sha256').update('').digest('hex');
  const canonicalQuery = 'list-type=2&prefix=docs%2F';
  const signedHeaders = ['host', 'x-amz-content-sha256', 'x-amz-date'];
  const canonicalHeaders = [
    `host:localhost`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
  ].join('\n');

  const canonicalRequest = [
    'GET',
    '/',
    canonicalQuery,
    canonicalHeaders,
    signedHeaders.join(';'),
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
  ].join('\n');

  const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp, 'utf8').digest();
  const kRegion = createHmac('sha256', kDate).update(region, 'utf8').digest();
  const kService = createHmac('sha256', kRegion).update(service, 'utf8').digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return {
    method: 'GET',
    originalUrl: `/?${canonicalQuery}`,
    headers: {
      host: 'localhost',
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  } as any;
}

test('verifySecretKey accepts matching keys and rejects mismatches', () => {
  const secret = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
  const hash = createHash('sha256').update(secret, 'utf8').digest('hex');

  assert.equal(verifySecretKey(secret, hash), true);
  assert.equal(verifySecretKey('wrong-secret', hash), false);
});

test('verifySigV4Request accepts a valid signed request', async () => {
  const secretKey = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
  const request = buildSignedRequest(secretKey);

  await verifySigV4Request(request, secretKey);
});

test('verifySigV4Request rejects a tampered signature', async () => {
  const secretKey = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
  const request = buildSignedRequest(secretKey);
  request.headers.authorization = request.headers.authorization.replace(/Signature=[a-f0-9]+$/, 'Signature=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');

  await assert.rejects(async () => verifySigV4Request(request, secretKey), { code: 'SignatureDoesNotMatch' });
});
