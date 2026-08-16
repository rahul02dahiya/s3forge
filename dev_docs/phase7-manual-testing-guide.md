# Manual Testing Guide: Multi-Tenant Folder Isolation & RBAC (Phase 7)

This manual testing guide allows you to test and verify the new **Folder-Based Multi-Tenant Isolation** and **Role-Based Access Control (RBAC)** features implemented in S3Forge.

---

## 📋 Overview of What We Are Testing

1. **MinIO Folder Hierarchy**: Storing objects under `s3forge-storage/<org-slug>/u<user-id>/<bucket-name>/<object-name>`.
2. **Role-Based Access Control (RBAC)**: Enforcing `owner` and `admin` roles for bucket creation, deletion, audit logs, and usage recalculations, while `member` roles get 403 Forbidden.
3. **Tenant Scope Enforcement**: Guaranteeing that users can only view or manage buckets owned by their organization.

---

## 🛠️ Prerequisites

Ensure local PostgreSQL and MinIO are running, then start the API server:

```bash
# Start backend API server
pnpm --filter @s3forge/api dev
```

The API server will run at `http://localhost:3000/api/v1`.

---

## 🧪 Test Flow 1: Create Owner Account & Verify Admin Operations

### Step 1: Register Organization Owner
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@acme.com",
    "password": "SecurePassword123!",
    "displayName": "Alice Owner",
    "organizationName": "Acme Corp"
  }'
```
*Save the returned `token` as `OWNER_TOKEN`.* (Role automatically defaults to `owner`).

### Step 2: Create a Storage Bucket as Owner (Allowed)
```bash
curl -X POST http://localhost:3000/api/v1/storage/buckets \
  -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "project-assets",
    "region": "us-east-1",
    "visibility": "private"
  }'
```
**Expected Outcome (201 Created)**: Bucket record created in PostgreSQL. `minioBucketName` will be formatted as `acme-corp/u1/project-assets`.

---

## 🧪 Test Flow 2: Test Presigned Upload & MinIO Folder Tree

### Step 1: Generate Presigned Upload URL
```bash
curl -X POST http://localhost:3000/api/v1/storage/buckets/project-assets/objects/presigned-upload \
  -H "Authorization: Bearer <OWNER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "objectName": "logos/brand.png",
    "expirySeconds": 3600,
    "contentType": "image/png"
  }'
```
**Expected Outcome (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "uploadUrl": "http://127.0.0.1:9000/s3forge-storage/acme-corp/u1/project-assets/logos/brand.png?...",
    "bucketName": "project-assets",
    "objectName": "logos/brand.png"
  }
}
```

### Step 2: Upload File via Presigned URL
```bash
curl -X PUT -H "Content-Type: image/png" --data-binary "dummy-image-data" "<UPLOAD_URL>"
```

### Step 3: Inspect MinIO Console 9001
1. Open browser at `http://localhost:9001` (login with MinIO root credentials).
2. Open the `s3forge-storage` bucket.
3. Observe the folder hierarchy: `acme-corp` $\rightarrow$ `u1` $\rightarrow$ `project-assets` $\rightarrow$ `logos` $\rightarrow$ `brand.png`.

---

## 🧪 Test Flow 3: Verify Role-Based Restrictions (RBAC)

### Step 1: Register a Second User in a Second Organization (Or Member)
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@globex.com",
    "password": "SecurePassword123!",
    "displayName": "Bob Globex",
    "organizationName": "Globex Inc"
  }'
```
*Save token as `GLOBEX_TOKEN`.*

### Step 2: Attempt to Access Acme Corp Buckets as Globex User (Isolation Check)
```bash
curl -X GET http://localhost:3000/api/v1/storage/buckets/project-assets \
  -H "Authorization: Bearer <GLOBEX_TOKEN>"
```
**Expected Outcome (404 Not Found)**: Globex user cannot see or access Acme Corp's bucket. Multi-tenant isolation is enforced!

---

## 🧪 Test Flow 4: Verify Member Role Denial (403 Forbidden)

If a user has the `member` or `viewer` role in an organization:

```bash
# Attempt to create a bucket as Member
curl -X POST http://localhost:3000/api/v1/storage/buckets \
  -H "Authorization: Bearer <MEMBER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "forbidden-bucket" }'
```
**Expected Outcome (403 Forbidden)**:
```json
{
  "status": "error",
  "code": "FORBIDDEN",
  "message": "Insufficient permissions. Required role: owner or admin. Your role: member"
}
```

---

## ✅ Summary Verification Checklist

- [ ] `s3forge-storage` root bucket is automatically initialized on server startup.
- [ ] Uploaded objects appear in MinIO under `s3forge-storage/<org-slug>/u<user-id>/<bucket-name>/<object-name>`.
- [ ] Users in Organization B receive 404 Not Found when trying to access Organization A's buckets.
- [ ] Non-admin roles receive 403 Forbidden when attempting to create/delete buckets or view audit logs.
