# S3Forge Backend Architecture Guide

This guide explains how the S3Forge backend architecture is structured, where specific responsibilities reside in the codebase, and how requests flow through the application.

---

## Architectural Pattern: Strict Layered Design

S3Forge uses a layered architecture to separate HTTP protocol handling, input validation, business logic, and database/storage interactions. Data flows strictly downward through each layer.

```text
HTTP Request
  ├──> Routes (apps/api/src/routes/)
  ├──> Auth & Validation Middleware (apps/api/src/middleware/authenticate.ts & validate.ts)
  ├──> Controller (apps/api/src/controllers/)
  ├──> Service Layer (apps/api/src/services/)
  ├──> Repository Layer (apps/api/src/repositories/) & MinIO Wrapper (apps/api/src/lib/minio-client.ts)
  └──> PostgreSQL 17 & MinIO Engines
```

---

## Layer Breakdown & Component Locations

### 1. Route Definitions (`apps/api/src/routes/`)
- **Location**: `apps/api/src/routes/` (`auth.routes.ts`, `storage.routes.ts`, `credential.routes.ts`, `audit.routes.ts`, `health.routes.ts`, `docs.routes.ts`)
- **Role**: Maps HTTP methods and URL paths to validation middleware and controller handlers.
- **Responsibility**: Registers endpoint paths, query parameters, request bodies, and response metadata with the global OpenAPI registry (`apps/api/src/config/swagger.ts`) so Swagger UI is updated automatically.

### 2. Request Validation (`apps/api/src/validators/` & `apps/api/src/middleware/validate.ts`)
- **Location**: Validation schemas in `apps/api/src/validators/` (`auth.validators.ts`, `storage.validators.ts`, `credential.validators.ts`, `usage.validators.ts`, `audit.validators.ts`), executed by middleware in `apps/api/src/middleware/validate.ts`.
- **Role**: Intercepts requests before controllers execute. Checks `req.body`, `req.query`, and `req.params` against Zod schemas.
- **Responsibility**: If validation fails, it immediately aborts the request and returns a standardized 400 error response detailing which fields failed validation.

### 3. Authentication & Security Middleware (`apps/api/src/middleware/authenticate.ts`)
- **Location**: `apps/api/src/middleware/authenticate.ts`, `apps/api/src/lib/password.ts`, `apps/api/src/lib/jwt.ts`
- **Role**: Identity verification and access authorization.
- **Responsibility**: Supports dual authentication methods:
  - **JWT Bearer Token**: Evaluates `Authorization: Bearer <token>` header for user dashboard access.
  - **S3 Access Key Header**: Evaluates `X-S3Forge-Access-Key` header for programmatic API access.
  Populates `req.user` and `req.organizationId` on the Express Request object.

### 4. Controller Layer (`apps/api/src/controllers/`)
- **Location**: `apps/api/src/controllers/` (`auth.controller.ts`, `storage.controller.ts`, `credential.controller.ts`, `usage.controller.ts`, `audit.controller.ts`, `health.controller.ts`)
- **Role**: Thin HTTP orchestration layer.
- **Responsibility**: Extracts validated input from the request, calls the appropriate service method, and formats the result into standard JSON success envelopes (`sendSuccess` helper in `apps/api/src/lib/response.ts`). Controllers contain no SQL or direct MinIO calls.

### 5. Service Layer (`apps/api/src/services/`)
- **Location**: `apps/api/src/services/` (`auth.service.ts`, `storage.service.ts`, `credential.service.ts`, `usage.service.ts`, `audit.service.ts`)
- **Role**: Core business logic, storage scans, and non-blocking audit event emitting.
- **Responsibility**: Implements domain rules such as organization-prefixing bucket names, generating S3 keypairs with timing-safe SHA-256 secret hashing, scanning MinIO storage object byte sizes, and triggering non-blocking audit logs for state changes.

### 6. Repository Layer (`apps/api/src/repositories/`)
- **Location**: `apps/api/src/repositories/` (`user.repository.ts`, `bucket.repository.ts`, `s3-credential.repository.ts`, `usage-snapshot.repository.ts`, `audit-log.repository.ts`)
- **Role**: Pure data access abstraction over Drizzle ORM.
- **Responsibility**: Executes SQL queries against PostgreSQL tables (`users`, `organizations`, `organization_members`, `buckets`, `s3_credentials`, `usage_snapshots`, `audit_logs`). Handles pagination math, organization filtering, and soft-delete filtering.

### 7. MinIO Storage Client Wrapper (`apps/api/src/lib/minio-client.ts`)
- **Location**: `apps/api/src/lib/minio-client.ts`
- **Role**: Storage engine wrapper.
- **Responsibility**: Wraps the raw MinIO JavaScript SDK with exponential backoff retries and random jitter to gracefully handle transient network hiccups or temporary storage service restarts.

---

## Global Cross-Cutting Concerns

- **Request ID Tracking**: Every request is assigned a UUID v4 correlation ID by `apps/api/src/middleware/request-id.ts`. This ID is included in response headers (`X-Request-Id`) and attached to logger instances.
- **Audit Logging System**: Platform state modifications (e.g. `user.register`, `user.login`, `bucket.create`, `bucket.delete`, `credential.create`, `credential.revoke`) are asynchronously recorded by `auditService.recordAudit()` into `audit_logs` table without blocking user response latency.
- **Structured Logging**: Log messages are formatted as JSON using Pino (`apps/api/src/lib/logger.ts`). Sensitive keys like passwords, secret keys, tokens, and authorization headers are redacted automatically.
- **Error Handling**: Custom domain errors inherit from `AppError` (`apps/api/src/lib/app-error.ts`). Unhandled exceptions are caught by `apps/api/src/middleware/error-handler.ts` and returned as standard error envelopes without leaking internal stack traces in production.
