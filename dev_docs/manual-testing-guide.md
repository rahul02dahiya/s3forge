# S3Forge Backend — Comprehensive Manual Testing Guide

This guide provides step-by-step instructions, cURL commands, and request JSON payloads for manually testing every endpoint and feature in the S3Forge backend.

---

## 🚀 1. Prerequisites & Server Startup

### Step 1: Start PostgreSQL 17 & MinIO Services
Ensure your local PostgreSQL and MinIO instances are running. (If using Docker Compose):
```bash
docker compose up -d
```

### Step 2: Start API Development Server
From the project root directory, launch the API server:
```bash
pnpm --filter @s3forge/api dev
```
The server will start on port `3000` (or the port defined in `.env`).

### Step 3: Interactive Swagger UI
Open your browser and navigate to:
```text
http://localhost:3000/api/v1/docs
```
You can execute all tests directly via Swagger UI or use the cURL commands below.

---

## 🔍 2. Testing Endpoints Catalog

### Phase 1: System Health Probe

#### `GET /api/v1/health`
Verify that PostgreSQL and MinIO storage engines are healthy and connected.

**cURL Request:**
```bash
curl -X GET http://localhost:3000/api/v1/health
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "System is healthy",
  "data": {
    "status": "healthy",
    "uptime": 12.45,
    "timestamp": "2026-08-09T14:45:00.000Z",
    "checks": {
      "database": { "status": "up" },
      "minio": { "status": "up" }
    }
  }
}
```

---

### Phase 2: User Authentication & Organization Setup

#### 1. Register User & Organization (`POST /api/v1/auth/register`)
Creates a new user account, password hash (`scrypt`), and default organization.

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@s3forge.dev",
    "password": "SecurePassword123!",
    "displayName": "Alex Developer",
    "organizationName": "Acme Cloud Corp"
  }'
```

**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "developer@s3forge.dev",
      "displayName": "Alex Developer"
    },
    "organization": {
      "id": 1,
      "name": "Acme Cloud Corp",
      "slug": "acme-cloud-corp"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
> 💡 **Save the `token` string for subsequent authenticated requests!**

---

#### 2. User Login (`POST /api/v1/auth/login`)

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@s3forge.dev",
    "password": "SecurePassword123!"
  }'
```

---

#### 3. Fetch Authenticated Profile (`GET /api/v1/auth/me`)

**cURL Request:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

#### 4. Forgot Password Request (`POST /api/v1/auth/forgot-password`)
Triggers an email with a 32-byte secure password reset token URL. Rate limited to 3 requests per 15 minutes per IP.

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@s3forge.dev"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "If an account with that email address exists, a password reset link has been sent."
}
```

---

#### 5. Complete Password Reset (`POST /api/v1/auth/reset-password`)
Resets user password using the unhashed token sent to the user's email address. Rate limited to 5 attempts per 15 minutes per IP.

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RAW_TOKEN_FROM_EMAIL",
    "newPassword": "NewSecurePassword123!"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

---

#### 6. SMTP Service Diagnostics & Email Template Verification (CLI Tool)
Test SMTP server connectivity and verify HTML email templates directly from the CLI:

```bash
# Test Password Reset Email Template (default)
pnpm run test:smtp developer@s3forge.dev reset

# Test Account Welcome Email Template
pnpm run test:smtp developer@s3forge.dev welcome

# Test ALL Templates in a single execution
pnpm run test:smtp developer@s3forge.dev all
```

---

### Phase 3: S3 Credentials Keypair Management

#### 1. Create S3 Keypair (`POST /api/v1/credentials`)
Generates an Access Key and Secret Key pair. **The secret key is shown ONLY ONCE.**

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/credentials \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Production CLI Backup Key"
  }'
```

**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "S3 access credential created successfully",
  "data": {
    "id": 1,
    "accessKey": "AKIA4X79F1A2B3C4D5E6",
    "secretKey": "sec_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
    "description": "Production CLI Backup Key",
    "isActive": true
  }
}
```
> 💡 **Save `accessKey` and `secretKey`. Note that secretKey will never be shown again.**

---

#### 2. List S3 Credentials (`GET /api/v1/credentials`)

**cURL Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/credentials?page=1&limit=20" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

#### 3. Revoke/Deactivate Credential (`PATCH /api/v1/credentials/:id/revoke`)

**cURL Request:**
```bash
curl -X PATCH http://localhost:3000/api/v1/credentials/1/revoke \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

#### 4. Delete Credential (`DELETE /api/v1/credentials/:id`)

**cURL Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/credentials/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### Phase 4: Storage Bucket Control Plane

> 🔒 **Auth Note**: Endpoints accept either `Authorization: Bearer <jwt>` OR `X-S3Forge-Access-Key: <accessKey>`.

#### 1. Create Bucket (`POST /api/v1/storage/buckets`)

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/storage/buckets \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "app-backups",
    "region": "us-east-1",
    "visibility": "private",
    "quotaBytes": 10737418240
  }'
```

**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "Bucket created successfully",
  "data": {
    "id": 1,
    "name": "app-backups",
    "minioBucketName": "org1-app-backups",
    "region": "us-east-1",
    "visibility": "private"
  }
}
```

---

#### 2. List Buckets (`GET /api/v1/storage/buckets`)

**cURL Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/storage/buckets?page=1&limit=20" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

#### 3. Soft-Delete Bucket (`DELETE /api/v1/storage/buckets/:name`)

**cURL Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/storage/buckets/app-backups \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### Phase 5: Storage Usage Snapshots & Metrics

#### 1. Get Organization-Wide Usage (`GET /api/v1/storage/usage`)

**cURL Request:**
```bash
curl -X GET http://localhost:3000/api/v1/storage/usage \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Organization storage usage summary retrieved",
  "data": {
    "organizationId": 1,
    "totalBuckets": 1,
    "totalObjects": 14,
    "totalStorageBytes": 1548576,
    "bucketsUsage": [
      {
        "id": 1,
        "name": "app-backups",
        "objectCount": 14,
        "totalBytes": 1548576
      }
    ]
  }
}
```

---

#### 2. Recalculate MinIO Bucket Usage (`POST /api/v1/storage/buckets/:name/usage/recalculate`)

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/storage/buckets/app-backups/usage/recalculate \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### Phase 6: Object Storage Data Plane APIs

#### 1. Generate Presigned Upload URL (`POST /api/v1/storage/buckets/:name/objects/presigned-upload`)

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/storage/buckets/app-backups/objects/presigned-upload \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "objectName": "documents/report.pdf",
    "expirySeconds": 3600,
    "contentType": "application/pdf"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Presigned upload URL generated successfully",
  "data": {
    "uploadUrl": "http://127.0.0.1:9000/org1-app-backups/documents/report.pdf?X-Amz-Algorithm=...",
    "bucketName": "app-backups",
    "objectName": "documents/report.pdf",
    "expirySeconds": 3600
  }
}
```

**Test Uploading File to Presigned URL:**
```bash
curl -X PUT -H "Content-Type: application/pdf" --upload-file ./my-report.pdf "<UPLOAD_URL_FROM_ABOVE>"
```

---

#### 2. List Objects in Bucket (`GET /api/v1/storage/buckets/:name/objects`)

**cURL Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/storage/buckets/app-backups/objects?prefix=documents/&limit=50" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

#### 3. Inspect Object Metadata (`GET /api/v1/storage/buckets/:name/objects/stat`)

**cURL Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/storage/buckets/app-backups/objects/stat?objectName=documents/report.pdf" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

#### 4. Generate Presigned Download URL (`POST /api/v1/storage/buckets/:name/objects/presigned-download`)

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/storage/buckets/app-backups/objects/presigned-download \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "objectName": "documents/report.pdf",
    "expirySeconds": 3600
  }'
```

**Test Downloading File from Presigned URL:**
```bash
curl -o downloaded-report.pdf "<DOWNLOAD_URL_FROM_ABOVE>"
```

---

#### 5. Single Object Delete (`DELETE /api/v1/storage/buckets/:name/objects`)

**cURL Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/storage/buckets/app-backups/objects \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "objectName": "documents/report.pdf"
  }'
```

---

#### 6. Batch Objects Delete (`POST /api/v1/storage/buckets/:name/objects/batch-delete`)

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/v1/storage/buckets/app-backups/objects/batch-delete \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "objectNames": ["temp1.txt", "temp2.txt", "temp3.txt"]
  }'
```

---

### Phase 7: Audit Log Activity Trail

#### `GET /api/v1/audit-logs`
Retrieve paginated audit trail of all business actions (`user.register`, `user.login`, `bucket.create`, `credential.create`, `object.presigned_upload`, `object.delete`).

**cURL Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/audit-logs?page=1&limit=20" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Audit log entries retrieved successfully",
  "data": [
    {
      "id": 1,
      "organizationId": 1,
      "userId": 1,
      "action": "user.register",
      "resourceType": "user",
      "resourceId": "1",
      "ipAddress": "::1",
      "createdAt": "2026-08-09T14:45:00.000Z"
    },
    {
      "id": 2,
      "organizationId": 1,
      "userId": 1,
      "action": "bucket.create",
      "resourceType": "bucket",
      "resourceId": "1",
      "createdAt": "2026-08-09T14:46:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

## 🎯 Verification Checklist

- [ ] `GET /health` returns healthy DB and MinIO check.
- [ ] User registration & login generates valid Bearer JWT.
- [ ] Credential generation returns secretKey **ONLY ONCE**.
- [ ] Bucket creation creates org-prefixed bucket in MinIO (`org1-app-backups`).
- [ ] Presigned upload URL uploads a file successfully via cURL.
- [ ] Presigned download URL retrieves the file intact via cURL.
- [ ] Storage usage recalculation snapshots object counts and byte totals.
- [ ] Audit log endpoint displays full chronological activity stream.
