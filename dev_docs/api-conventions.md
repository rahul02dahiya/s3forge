# S3Forge API Conventions & Design Standards

This document describes the API design conventions, response envelopes, validation requirements, authentication standards, and storage rules enforced across the S3Forge platform.

---

## API Base Path & Versioning

- **Base URL**: `/api/v1`
- **Versioning Rule**: All endpoints are mounted under versioned path prefixes (`/api/v1/auth`, `/api/v1/storage`, `/api/v1/credentials`). Breaking changes to request parameters or response envelopes require incrementing the URL version segment (e.g. `/api/v2`).

---

## Authentication & Authorization Conventions

### 1. Dual Authentication Headers
Endpoints in S3Forge accept two forms of authentication via `apps/api/src/middleware/authenticate.ts`:
- **User Dashboard Requests**: `Authorization: Bearer <jwt_token>` (HMAC-SHA256 signed JWTs valid for 7 days).
- **Programmatic S3 Access**: `X-S3Forge-Access-Key: <access_key>` (Validates active keypairs in `s3_credentials`).

### 2. S3 Secret Access Key Security Policy
- Secret Access Keys are generated as 40-character high-entropy random strings.
- In PostgreSQL, only the SHA-256 hash (`secret_key_hash`) is stored.
- The raw plaintext `secretKey` is returned in the API response **ONLY ONCE** upon initial key generation (`POST /api/v1/credentials`). Subsequent queries (`GET /api/v1/credentials`) return metadata without the secret key.

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

#### Storage Bucket Operations (`/api/v1/storage`)
- `POST /api/v1/storage/buckets`: Create a new storage bucket (org-prefixed inside MinIO engine).
- `GET /api/v1/storage/buckets`: List organization buckets.
- `GET /api/v1/storage/buckets/:name`: Get bucket details.
- `DELETE /api/v1/storage/buckets/:name`: Soft-delete a storage bucket (`is_deleted = true`).

---

## Multi-Tenant Storage & Bucket Naming Strategy

1. **User-Facing vs Internal MinIO Name**:
   - **User-Facing Name**: Unique per organization (e.g., `app-backups`).
   - **Internal MinIO Name**: Unique globally in MinIO engine (`org1-app-backups`).
2. **Soft Deletion Policy**:
   - Deleting a bucket sets `is_deleted = true` in PostgreSQL.
   - Historical audit logs and usage metrics are preserved while excluding deleted buckets from standard list queries.
