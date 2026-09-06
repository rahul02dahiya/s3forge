# S3Forge API Conventions & Design Standards

This document describes the API design conventions, response envelopes, validation requirements, authentication standards, and storage rules enforced across the S3Forge platform.

---

## API Base Path & Versioning

- **JSON API Base URL**: `/api/v1`
- **S3-Compatible Gateway Base URL**: `/s3`
- **Versioning Rule**: All endpoints are mounted under versioned path prefixes (`/api/v1/auth`, `/api/v1/storage`, `/api/v1/credentials`, `/api/v1/audit-logs`). Breaking changes to request parameters or response envelopes require incrementing the URL version segment (e.g. `/api/v2`).

---

## Authentication & Authorization Conventions

### 1. Dual Authentication Headers
Endpoints in S3Forge accept two forms of authentication via `apps/api/src/middleware/authenticate.ts`:
- **User Dashboard Requests**: `Authorization: Bearer <jwt_token>` (HMAC-SHA256 signed JWTs valid for 7 days).
- **Programmatic JSON API Access**: `X-S3Forge-Access-Key: <access_key>` and `X-S3Forge-Secret-Key: <secret_key>` (validates active keypairs in `s3_credentials`).
- **Native S3 Client Access**: AWS SigV4 requests against `/s3` using the generated access key and secret key.

### 2. S3 Secret Access Key Security Policy
- Secret Access Keys are generated as 40-character high-entropy random strings.
- In PostgreSQL, `secret_key_hash` is stored for custom-header verification and `secret_key_encrypted` is stored for SigV4 verification.
- The raw plaintext `secretKey` is returned in the API response **ONLY ONCE** upon initial key generation (`POST /api/v1/credentials`). Subsequent queries (`GET /api/v1/credentials`) return metadata without the secret key.

### 3. Role-Based Access Control (RBAC)
- All protected storage and audit routes require mandatory authentication (`authenticate()`).
- Administrative actions (`POST /storage/buckets`, `DELETE /storage/buckets/:name`, `POST /storage/buckets/:name/usage/recalculate`, `GET /audit-logs`) are restricted to users with `owner` or `admin` roles via `requireRole(['owner', 'admin'])`.

---

## Response Envelope Conventions

All API responses follow a uniform JSON structure produced by the helper functions in `apps/api/src/lib/response.ts`:

- **Success Envelope**:
  Contains a `status` indicator set to `"success"`, a human-readable `message`, a payload under `data`, and optional pagination metadata (`meta`) for list operations.
- **Error Envelope**:
  Contains a `status` indicator set to `"error"`, a high-level `message`, a machine-readable error `code` (e.g. `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`), and an optional `errors` array listing specific field-level validation issues.

---

## Endpoint Catalog & Swagger Documentation

Interactive API documentation and schema exploration are hosted live by the API server:
- **Swagger UI Interactive Docs**: `http://localhost:3000/api/v1/docs`
- **OpenAPI 3.1 Specification JSON**: `http://localhost:3000/api/v1/openapi.json`

### Endpoint Overview

#### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Create user account & default organization. Returns JWT access token.
- `POST /api/v1/auth/login`: Authenticate credentials. Returns JWT access token.
- `GET /api/v1/auth/me`: Retrieve profile of currently authenticated user and organization.

#### S3 Credentials Management (`/api/v1/credentials`)
- `POST /api/v1/credentials`: Generate new S3 access keypair (secret key returned ONCE).
- `GET /api/v1/credentials`: List organization credentials with pagination.
- `GET /api/v1/credentials/:id`: Get details of a specific credential keypair.
- `PATCH /api/v1/credentials/:id/revoke`: Deactivate (revoke) a credential keypair.
- `DELETE /api/v1/credentials/:id`: Delete a credential keypair.

#### Storage & Usage Operations (`/api/v1/storage`)
- `GET /api/v1/storage/usage`: Aggregate storage byte totals and object counts for organization.
- `POST /api/v1/storage/buckets`: Create a new storage bucket (`owner`/`admin` required).
- `GET /api/v1/storage/buckets`: List organization buckets.
- `GET /api/v1/storage/buckets/:name`: Get bucket details.
- `DELETE /api/v1/storage/buckets/:name`: Soft-delete a storage bucket (`owner`/`admin` required).
- `GET /api/v1/storage/buckets/:name/usage`: Get bucket usage metrics & historical trend (supports `page` and `limit` pagination parameters).
- `POST /api/v1/storage/buckets/:name/usage/recalculate`: Recalculate usage snapshot from MinIO storage engine (`owner`/`admin` required).

#### Object Data-Plane Operations (`/api/v1/storage/buckets/:name/objects`)
- `POST /api/v1/storage/buckets/:name/objects/presigned-upload`: Generate presigned PUT URL (`url`) for direct client S3 upload.
- `POST /api/v1/storage/buckets/:name/objects/presigned-download`: Generate presigned GET URL (`url`) for temporary file download.
- `GET /api/v1/storage/buckets/:name/objects`: List objects in a bucket with prefix filtering and recursive search (default: `recursive=true`).
- `GET /api/v1/storage/buckets/:name/objects/stat`: Get metadata for a specific object.
- `DELETE /api/v1/storage/buckets/:name/objects`: Delete a single object.
- `POST /api/v1/storage/buckets/:name/objects/batch-delete`: Batch delete multiple objects.

#### S3-Compatible Gateway (`/s3`)
- `GET /s3/`: List organization buckets for AWS CLI, boto3, and AWS SDKs.
- `HEAD /s3/:bucket`: Check whether an organization bucket exists.
- `GET /s3/:bucket`: List objects in an organization bucket.
- `PUT /s3/:bucket/:key`: Upload an object stream.
- `GET /s3/:bucket/:key`: Download an object stream.
- `HEAD /s3/:bucket/:key`: Inspect object metadata.
- `DELETE /s3/:bucket/:key`: Delete an object.

#### Audit Logging (`/api/v1/audit-logs`)
- `GET /api/v1/audit-logs`: Get paginated audit trail of organization state changes (`owner`/`admin` required).

---

## Multi-Tenant Storage & MinIO Folder Isolation Strategy

1. **User-Facing Bucket Name vs Internal MinIO Key Prefix**:
   - **User-Facing Bucket Name**: Unique per organization (e.g., `photos`).
   - **MinIO Root Bucket**: `s3forge-storage`.
   - **Internal Object Key Prefix**: `<org-slug>/u<user-id>/<bucket-name>/<object-name>` (e.g., `acme-corp/u12/photos/vacation.png`).
2. **MinIO Console (Port 9001) Navigation**:
   - Platform admins browsing port 9001 see a clean folder tree grouped by Organization (`acme-corp/`) $\rightarrow$ User (`u12/`) $\rightarrow$ Bucket (`photos/`).
3. **Soft Deletion & Prefix Cleanup**:
   - Deleting a bucket removes all object keys under `<org-slug>/u<user-id>/<bucket-name>/*` from MinIO and marks `is_deleted = true` in PostgreSQL.
