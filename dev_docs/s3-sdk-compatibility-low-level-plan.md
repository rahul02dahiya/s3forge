# S3 SDK Compatibility Low-Level Plan

## Goal

Make S3Forge credentials usable from native S3 clients such as AWS CLI and Python `boto3` without disturbing the existing dashboard JSON API.

Current state:

- S3Forge creates virtual credentials in `s3_credentials`.
- `/api/v1/storage/*` is a JSON API, not an S3-compatible API.
- `authenticate()` extracts access keys from SigV4 headers, but does not verify SigV4 signatures.
- `x-s3forge-secret-key` is documented, but currently ignored.
- Secrets are stored only as SHA-256 hashes, which cannot be used to recompute AWS SigV4 HMAC signatures.

Target state:

- Existing dashboard/API behavior continues to work.
- Custom header API auth validates both access key and secret key.
- AWS CLI and `boto3` use a dedicated S3-compatible gateway route.
- S3 gateway authenticates requests with AWS SigV4.
- S3 gateway returns S3-style XML responses and errors where SDKs expect them.

## Ponytail Plugin Note

The requested `/ponytail` plugin is not available in this session. Tool discovery found no Ponytail tools. This plan is therefore based on direct repository inspection only.

## Non-Goals

Do not implement these in the first pass:

- Multipart upload.
- Bucket versioning.
- ACLs, bucket policies, IAM users, STS, or AssumeRole.
- Public anonymous object access.
- Object tagging, legal hold, retention, lifecycle rules.
- Virtual-hosted bucket addressing such as `bucket.localhost`.
- Direct MinIO per-tenant users.
- UI redesign.
- Replacing MinIO or changing the internal root bucket model.

## Architecture Decision

Add an S3-compatible gateway layer alongside the existing JSON API.

Do not try to make `/api/v1/storage` act like S3. AWS CLI and `boto3` expect S3 method/path/query semantics and XML responses. The existing `/api/v1/storage` endpoints are dashboard/application endpoints and should remain JSON.

Recommended gateway base path:

- Local/simple: `/s3`
- Production through Caddy: `https://s3.<domain>/`

If using `/s3` locally, examples become:

```bash
aws --endpoint-url http://localhost:3000/s3 s3 ls
```

For the cleanest production SDK compatibility, prefer a dedicated domain whose root maps to the S3 gateway:

```bash
aws --endpoint-url https://s3.example.com s3 ls
```

Runtime config discovery
------------------------

The frontend uses a small public endpoint to discover runtime values such as the S3 gateway region and base path. Add a note that clients or scripts can call:

```bash
curl -X GET http://localhost:3000/api/v1/config
```

This returns JSON like:

```json
{
  "status": "success",
  "message": "Runtime config",
  "data": { "s3Gateway": { "region": "us-east-1", "basePath": "/s3" } }
}
```

Use this value to ensure SigV4 signing region matches the gateway region when creating presigned URLs or initializing SDK clients.


## Routes That Require S3 Compatibility

These routes must be added because AWS CLI and `boto3` call them directly.

### `GET /s3/`

Purpose:

- List buckets visible to the credential's organization.

AWS behavior:

- `aws s3 ls`
- `boto3.client("s3").list_buckets()`

Implementation:

- Authenticate with SigV4.
- Use `bucketRepository.findPaginated()` or add a non-paginated organization-scoped repository method.
- Return S3 `ListAllMyBucketsResult` XML.

Guardrails:

- Return only buckets for `req.organizationId`.
- Never expose internal `minioBucketName` prefixes.
- Do not include soft-deleted buckets.

### `HEAD /s3/:bucket`

Purpose:

- Check whether a bucket exists.

AWS behavior:

- SDKs often call this before operations.

Implementation:

- Authenticate with SigV4.
- Look up bucket by visible bucket name and organization.
- Return `200` if present, `404` S3 XML/error style if missing.

Guardrails:

- Do not reveal whether another organization owns a bucket with the same name.

### `GET /s3/:bucket`

Purpose:

- List objects in a bucket.

AWS behavior:

- `aws s3 ls s3://bucket`
- `boto3.client("s3").list_objects_v2(Bucket="bucket")`

Important query parameters:

- `list-type=2`
- `prefix`
- `delimiter`
- `continuation-token`
- `max-keys`

Implementation:

- Start with `list-type=2`.
- Map visible bucket name to internal prefix from `bucket.minioBucketName`.
- Use MinIO `listObjectsV2(ROOT_BUCKET, fullPrefix, recursive)`.
- Strip internal prefix before returning object keys.
- Return S3 `ListBucketResult` XML.

Guardrails:

- Enforce `max-keys` cap.
- Do not return keys outside the mapped bucket prefix.
- Add a code comment near prefix construction explaining tenant isolation.

### `PUT /s3/:bucket/:key(*)`

Purpose:

- Upload an object.

AWS behavior:

- `aws s3 cp file s3://bucket/key`
- `boto3.client("s3").put_object(...)`

Implementation:

- Authenticate with SigV4.
- Resolve bucket by organization and visible name.
- Stream request body into MinIO using internal key:
  `<bucket.minioBucketName>/<key>`.
- Return `ETag` header when available.

Guardrails:

- Do not buffer large object bodies into memory.
- Reject empty or unsafe keys.
- Normalize leading slashes.
- Prevent `..` path traversal style keys from escaping the prefix.
- Enforce bucket quota if quota logic exists or add a TODO comment if not implemented in first pass.

### `GET /s3/:bucket/:key(*)`

Purpose:

- Download an object.

AWS behavior:

- `aws s3 cp s3://bucket/key file`
- `boto3.client("s3").get_object(...)`

Implementation:

- Authenticate with SigV4.
- Resolve bucket by organization and visible name.
- Stream MinIO object to response.
- Forward useful headers: `Content-Length`, `Content-Type`, `ETag`, `Last-Modified`.

Guardrails:

- Do not use `sendSuccess`; this is a raw object stream route.
- Return S3 XML error style for missing objects.

### `HEAD /s3/:bucket/:key(*)`

Purpose:

- Fetch object metadata.

AWS behavior:

- `boto3.client("s3").head_object(...)`
- AWS CLI may call this during sync/cp operations.

Implementation:

- Use MinIO `statObject`.
- Return metadata headers without body.

Guardrails:

- Keep response body empty.

### `DELETE /s3/:bucket/:key(*)`

Purpose:

- Delete an object.

AWS behavior:

- `aws s3 rm s3://bucket/key`
- `boto3.client("s3").delete_object(...)`

Implementation:

- Use existing internal key mapping.
- Return `204` or S3-compatible success response.

Guardrails:

- Scope deletion to credential organization.
- Audit as `object.delete`.

## Routes That Should Not Become S3-Compatible

These routes should remain JSON API routes because they are used by the web dashboard and app workflows.

### `/api/v1/auth/*`

Why not:

- Login, signup, forgot password, reset password are application identity flows.
- AWS SDKs do not call these.

### `/api/v1/credentials/*`

Why not:

- Credential lifecycle management is an admin/dashboard function.
- AWS SDKs consume credentials; they do not create or revoke them through S3 protocol.

Required change:

- Keep these routes JSON.
- Update credential creation internals to store encrypted secret material for SigV4.
- Continue returning raw secret only once.

### `/api/v1/storage/*`

Why not:

- These endpoints use JSON request/response envelopes.
- They include application-specific concepts like visibility, quotas, usage recalculation, and presigned URL helpers.
- Changing them to XML/S3 behavior would break the frontend.

Required change:

- Fix custom access-key auth to require the secret key.
- Do not add AWS CLI examples using `/api/v1/storage`.

### `/api/v1/audit-logs/*`

Why not:

- Internal admin/reporting API.
- No S3 SDK equivalent.

### `/api/v1/docs`, `/api/v1/health`

Why not:

- Operational/documentation endpoints.
- No S3 SDK equivalent.

## Database Plan

### Add encrypted secret support

Modify:

- `packages/database/src/schema/s3-credentials.ts`
- Add migration under `packages/database/src/migrations/`
- `apps/api/src/repositories/s3-credential.repository.ts`
- `apps/api/src/services/credential.service.ts`

Add column:

```sql
ALTER TABLE "s3_credentials"
ADD COLUMN "secret_key_encrypted" text;
```

Later, after all active credentials have encrypted secret material, consider making it `NOT NULL`.

Guardrail:

- Do not remove `secret_key_hash`; it is still useful for constant-time custom secret verification and backward compatibility during migration.

### Existing credentials

Existing generated credentials cannot be upgraded because the plaintext secret was shown once and not stored. They should be marked as:

- usable only for old custom-header auth if secret hash validation is implemented; or
- requiring rotation for AWS SDK support.

Plan:

- Add docs telling users to create a new keypair for AWS CLI/boto3 support.
- Optional later migration: add `supports_sigv4` computed from `secret_key_encrypted IS NOT NULL`.

## Config Plan

Modify:

- `packages/config/src/env.ts`
- `.env.example`
- `docker-compose.prod.yml`

Add:

```env
S3FORGE_CREDENTIAL_ENCRYPTION_KEY=
S3_GATEWAY_BASE_PATH=/s3
S3_GATEWAY_REGION=us-east-1
```

Encryption key requirements:

- 32-byte key, base64 encoded.
- Required in production.
- Development may generate a warning-only fallback, but document that fallback invalidates encrypted credentials across restarts.

Guardrails:

- Do not reuse `JWT_SECRET` for credential encryption.
- Do not log encryption keys, plaintext secrets, canonical requests, signatures, or decrypted secrets.

## Credential Crypto Plan

Create:

- `apps/api/src/lib/credential-crypto.ts`

Functions:

- `encryptSecretKey(secretKey: string): string`
- `decryptSecretKey(ciphertext: string): string`

Recommended algorithm:

- AES-256-GCM via Node `crypto`.
- Store encoded payload as `v1:<ivBase64>:<tagBase64>:<ciphertextBase64>`.

Comments to add:

- Explain that SigV4 needs reversible secret access because the server must recompute HMAC signatures.
- Explain why the UI still shows plaintext only once.

Guardrails:

- Throw startup/config errors for invalid production key length.
- Never expose decrypted secret outside auth verification.

## Auth Plan

Modify:

- `apps/api/src/middleware/authenticate.ts`
- `apps/api/src/lib/credential-generator.ts`

### Fix custom header auth first

Current documented custom headers:

- `x-s3forge-access-key`
- `x-s3forge-secret-key`

Required behavior:

- If `x-s3forge-access-key` is present, require `x-s3forge-secret-key`.
- Verify `x-s3forge-secret-key` using existing `verifySecretKey()`.
- Reject inactive credentials.
- Set `req.organizationId` only after secret verification succeeds.

Guardrails:

- Do not authenticate custom-header requests by access key alone.
- Return a generic unauthorized message; do not reveal whether access key or secret failed.

### Add SigV4 auth separately

Create:

- `apps/api/src/lib/sigv4.ts`
- `apps/api/src/middleware/authenticate-s3.ts`

Responsibilities:

- Parse `Authorization: AWS4-HMAC-SHA256 ...`.
- Parse signed headers.
- Reconstruct canonical request.
- Reconstruct string-to-sign.
- Decrypt secret key.
- Derive SigV4 signing key.
- Constant-time compare expected signature vs provided signature.
- Support `UNSIGNED-PAYLOAD` for SDK/client compatibility where appropriate.
- Validate `x-amz-date` clock skew, recommended max 15 minutes.

Guardrails:

- Keep SigV4 auth middleware only on `/s3` gateway routes.
- Do not run normal JSON body parsing before S3 upload streams.
- Do not accept requests missing required signed headers.
- Do not log canonical request in production.

## Express App Plan

Modify:

- `apps/api/src/app.ts`

Current issue:

- `express.json()` is global before all routes.
- S3 `PUT` object uploads must stream raw request bodies.

Required change:

- Mount S3 gateway before JSON body parsing.

Suggested order:

```ts
app.use(helmet());
app.use(cors(...));
app.use(requestId);
app.use(requestLogger);
app.use(requestTimeout);

app.use('/s3', s3GatewayRouter);

app.use(express.json({ limit: constants.SERVER.BODY_LIMIT }));
app.use('/api/v1', apiRouter);
```

Guardrails:

- Do not apply JSON validators to S3 gateway routes.
- Keep `notFound` and `errorHandler` last.
- S3 gateway errors may need their own XML error handler before the JSON error handler.

## S3 Gateway Files

Create:

- `apps/api/src/routes/s3-gateway.routes.ts`
- `apps/api/src/controllers/s3-gateway.controller.ts`
- `apps/api/src/services/s3-gateway.service.ts`
- `apps/api/src/lib/s3-xml.ts`
- `apps/api/src/lib/s3-errors.ts`
- `apps/api/src/middleware/authenticate-s3.ts`

### `s3-gateway.routes.ts`

Routes:

```ts
router.get('/', authenticateS3(), controller.listBuckets);
router.head('/:bucket', authenticateS3(), controller.headBucket);
router.get('/:bucket', authenticateS3(), controller.listObjects);
router.put('/:bucket/*key', authenticateS3(), controller.putObject);
router.get('/:bucket/*key', authenticateS3(), controller.getObject);
router.head('/:bucket/*key', authenticateS3(), controller.headObject);
router.delete('/:bucket/*key', authenticateS3(), controller.deleteObject);
```

Guardrail:

- Confirm Express 5 wildcard syntax in this project before finalizing `/:bucket/*key`. Use the syntax supported by installed `express@5.2.1`.

### `s3-gateway.service.ts`

Responsibilities:

- Resolve visible bucket by organization.
- Build internal object key.
- List buckets.
- List objects.
- Put/get/head/delete object through MinIO.

Important helper:

```ts
function buildInternalObjectKey(minioBucketName: string, objectKey: string): string
```

Comment to add:

- Explain that `minioBucketName` is an internal tenant prefix inside the shared `ROOT_BUCKET`, not a user-visible S3 bucket name.

Guardrails:

- All service methods must take `organizationId`.
- No method should accept only bucket name and object key without org scope.

### `s3-xml.ts`

Responsibilities:

- Escape XML entities.
- Serialize:
  - `ListAllMyBucketsResult`
  - `ListBucketResult`
  - `Error`

Guardrails:

- Do not hand-concatenate unescaped user-provided bucket names or object keys.

### `s3-errors.ts`

Responsibilities:

- Map internal errors to S3 error codes:
  - `NoSuchBucket`
  - `NoSuchKey`
  - `AccessDenied`
  - `InvalidAccessKeyId`
  - `SignatureDoesNotMatch`
  - `InvalidArgument`
  - `InternalError`

Guardrails:

- S3 gateway should not use `sendError()` JSON envelopes.

## OpenAPI / Frontend Plan

Do not add S3 gateway routes to the current JSON OpenAPI unless clearly separated.

Why:

- OpenAPI JSON client generation is for `/api/v1`.
- S3 protocol routes return XML/streams and are not consumed by the React dashboard.

Frontend changes:

- Minimal only.
- Optionally update `CredentialUsageGuideDialog.tsx` to show correct AWS CLI/boto3 examples.
- Do not change `apps/web/src/lib/api/client.ts` for S3 gateway.

## Documentation Plan

Modify:

- `dev_docs/basic-testing-guide.md`
- `dev_docs/manual-testing-guide.md`
- Optional: `README.md`

Required doc corrections:

- Remove AWS CLI examples pointing to `/api/v1/storage`.
- Show `/s3` or dedicated S3 endpoint.
- Explain old credentials must be rotated for AWS SDK compatibility if they lack encrypted secret material.
- Keep custom REST examples under `/api/v1/storage`.

Correct examples:

```bash
aws configure set aws_access_key_id "<YOUR_ACCESS_KEY>"
aws configure set aws_secret_access_key "<YOUR_SECRET_KEY>"
aws configure set default.region "us-east-1"
aws --endpoint-url http://localhost:3000/s3 s3 ls
```

```python
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="http://localhost:3000/s3",
    aws_access_key_id="<YOUR_ACCESS_KEY>",
    aws_secret_access_key="<YOUR_SECRET_KEY>",
    region_name="us-east-1",
)

print(s3.list_buckets())
```

## Test Plan

### Unit tests

Add tests for:

- `verifySecretKey()` success/failure.
- `encryptSecretKey()` / `decryptSecretKey()`.
- XML escaping and serialization.
- SigV4 canonical request construction using known fixtures.
- Signature mismatch rejection.
- Clock skew rejection.

### Integration tests

Add tests for:

- `x-s3forge-access-key` without secret returns 401.
- Wrong `x-s3forge-secret-key` returns 401.
- Correct custom headers still allow `/api/v1/storage/buckets`.
- AWS CLI `s3 ls` against `/s3` lists only current org buckets.
- `boto3.put_object`, `get_object`, `head_object`, `delete_object`.
- Revoked credential fails both custom auth and S3 gateway auth.

### Manual tests

```bash
aws --endpoint-url http://localhost:3000/s3 s3 ls
aws --endpoint-url http://localhost:3000/s3 s3 mb s3://test-bucket
aws --endpoint-url http://localhost:3000/s3 s3 cp ./README.md s3://test-bucket/README.md
aws --endpoint-url http://localhost:3000/s3 s3 ls s3://test-bucket
aws --endpoint-url http://localhost:3000/s3 s3 cp s3://test-bucket/README.md /tmp/s3forge-readme.md
aws --endpoint-url http://localhost:3000/s3 s3 rm s3://test-bucket/README.md
```

First pass may intentionally skip `s3 mb` if bucket creation remains dashboard/API-only. If skipped, document that users must create buckets in the dashboard or via `/api/v1/storage/buckets`.

## Implementation Order

1. Fix custom header auth to require and verify `x-s3forge-secret-key`.
2. Add encrypted secret column and config.
3. Update credential creation to store encrypted secret and hash.
4. Add SigV4 library with unit tests.
5. Add S3 XML/error helpers.
6. Add S3 gateway service with organization-scoped bucket/key mapping.
7. Mount `/s3` before `express.json()`.
8. Add `GET /s3/` list buckets.
9. Add `GET /s3/:bucket` list objects.
10. Add object `PUT`, `GET`, `HEAD`, `DELETE`.
11. Update documentation and credential usage guide.
12. Run typecheck, focused tests, and manual AWS CLI/boto3 smoke tests.

## Files Expected To Change

Backend:

- `apps/api/src/app.ts`
- `apps/api/src/middleware/authenticate.ts`
- `apps/api/src/repositories/s3-credential.repository.ts`
- `apps/api/src/services/credential.service.ts`
- `apps/api/src/lib/credential-generator.ts`
- `apps/api/src/lib/credential-crypto.ts`
- `apps/api/src/lib/sigv4.ts`
- `apps/api/src/lib/s3-xml.ts`
- `apps/api/src/lib/s3-errors.ts`
- `apps/api/src/middleware/authenticate-s3.ts`
- `apps/api/src/routes/s3-gateway.routes.ts`
- `apps/api/src/controllers/s3-gateway.controller.ts`
- `apps/api/src/services/s3-gateway.service.ts`

Database/config:

- `packages/database/src/schema/s3-credentials.ts`
- `packages/database/src/migrations/*`
- `packages/config/src/env.ts`
- `.env.example`
- `docker-compose.prod.yml`

Docs/UI:

- `dev_docs/basic-testing-guide.md`
- `dev_docs/manual-testing-guide.md`
- `apps/web/src/components/credentials/CredentialUsageGuideDialog.tsx`

## Files To Avoid Unless A Test Fails For A Clear Reason

- `apps/web/src/lib/api/client.ts`
- Authentication pages.
- Bucket dashboard layout/components unrelated to credential usage examples.
- `Caddyfile`, unless adding a dedicated S3 gateway domain.
- Existing generated `dist/` files.
- Unrelated database schemas.
- Existing MinIO client setup beyond required streaming calls.

## Questions For The User Before Implementation

1. Should the S3 gateway live at `/s3` on the API host, or on a dedicated domain like `s3.your-domain.com`?
2. Should AWS CLI be allowed to create/delete buckets with `aws s3 mb/rb`, or should bucket creation/deletion remain dashboard/API-only?
3. Are you okay requiring users to rotate existing credentials so new credentials can store encrypted secret material for SigV4?
4. Do you want first-pass support limited to common commands (`ls`, `cp`, `rm`, `boto3 put/get/head/delete`) before multipart upload?

