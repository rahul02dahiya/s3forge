# S3Forge Backend Architecture Guide

This guide explains how the S3Forge backend architecture is structured, where specific responsibilities reside in the codebase, and how requests flow through the application.

---

## Architectural Pattern: Strict Layered Design

S3Forge uses a layered architecture to separate HTTP protocol handling, input validation, business logic, and database/storage interactions. Data flows strictly downward through each layer.

```text
HTTP Request
  ├──> Routes (apps/api/src/routes/)
  ├──> Validation Middleware (apps/api/src/middleware/validate.ts)
  ├──> Controller (apps/api/src/controllers/)
  ├──> Service Layer (apps/api/src/services/)
  ├──> Repository Layer (apps/api/src/repositories/) & MinIO Wrapper (apps/api/src/lib/minio-client.ts)
  └──> PostgreSQL 17 & MinIO Engines
```

---

## Layer Breakdown & Component Locations

### 1. Route Definitions (`apps/api/src/routes/`)
- **Location**: `apps/api/src/routes/`
- **Role**: Maps HTTP methods and URL paths to validation middleware and controller handlers.
- **Responsibility**: Also registers endpoint paths, query parameters, request bodies, and response metadata with the global OpenAPI registry (`apps/api/src/config/swagger.ts`) so Swagger documentation is updated automatically.

### 2. Request Validation (`apps/api/src/validators/` & `apps/api/src/middleware/`)
- **Location**: Validation rules in `apps/api/src/validators/`, executed by middleware in `apps/api/src/middleware/validate.ts`.
- **Role**: Intercepts requests before controllers execute. Checks `req.body`, `req.query`, and `req.params` against Zod schemas.
- **Responsibility**: If validation fails, it immediately aborts the request and returns a standardized error response detailing which fields failed validation.

### 3. Controller Layer (`apps/api/src/controllers/`)
- **Location**: `apps/api/src/controllers/`
- **Role**: Thin HTTP orchestration layer.
- **Responsibility**: Extracts validated input from the request, calls the appropriate service method, and formats the result into standard JSON success envelopes (`sendSuccess` helper in `apps/api/src/lib/response.ts`). Controllers contain no SQL or direct MinIO calls.

### 4. Service Layer (`apps/api/src/services/`)
- **Location**: `apps/api/src/services/`
- **Role**: Core business logic and transaction management.
- **Responsibility**: Implements domain rules such as organization-prefixing bucket names, checking for duplicate resources, and coordinating multi-system operations (e.g., creating a bucket in MinIO first, then persisting metadata in PostgreSQL). If a database insert fails after MinIO bucket creation, the service executes a compensating rollback to remove the MinIO bucket.

### 5. Repository Layer (`apps/api/src/repositories/`)
- **Location**: `apps/api/src/repositories/`
- **Role**: Pure data access abstraction over Drizzle ORM.
- **Responsibility**: Executes SQL queries against PostgreSQL tables (such as `buckets`). Handles pagination math, organization filtering, and soft-delete filtering (`is_deleted = false`).

### 6. MinIO Storage Client Wrapper (`apps/api/src/lib/minio-client.ts`)
- **Location**: `apps/api/src/lib/minio-client.ts`
- **Role**: Storage engine wrapper.
- **Responsibility**: Wraps the raw MinIO JavaScript SDK with exponential backoff retries and random jitter to gracefully handle transient network hiccups or temporary storage service restarts.

---

## Global Cross-Cutting Concerns

- **Request ID Tracking**: Every request is assigned a UUID v4 correlation ID by `apps/api/src/middleware/request-id.ts`. This ID is included in response headers (`X-Request-Id`) and attached to logger instances.
- **Structured Logging**: Log messages are formatted as JSON using Pino (`apps/api/src/lib/logger.ts`). Sensitve keys like passwords, tokens, and authorization headers are redacted automatically.
- **Error Handling**: Custom domain errors inherit from `AppError` (`apps/api/src/lib/app-error.ts`). Unhandled exceptions are caught by `apps/api/src/middleware/error-handler.ts` and returned as standard error envelopes without leaking internal stack traces in production.
