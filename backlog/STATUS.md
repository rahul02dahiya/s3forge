# S3Forge Project Backlog & Agent Handoff

> **Branch:** `feat/backend-foundation`  
> **Last Updated:** 2026-08-09  
> **Status:** Phase 1 Foundation, Phase 2 Storage Core, Phase 3 S3 Credentials, Phase 4.1 Auth, and Phase 4.2 Usage Snapshots completed!

---

## 1. Project Context & Stack
- **Monorepo:** pnpm workspaces (`apps/api`, `apps/web`, `packages/config`, `packages/database`)
- **Backend Stack:** Node.js 22 LTS, Express 5, TypeScript 5.9+, ESM (`type: module`), Drizzle ORM (PostgreSQL 17), MinIO SDK.
- **Workflow Strategy:** Spiral SDLC (1 feature at a time, granular human-like commits on local feature branches, no auto-pushing required).

---

## 2. Completed Features (Chronological Commits)

1. **Foundational Library Setup** (`17419d6`)
   - `apps/api/src/lib/logger.ts`: Pino structured logger with JSON output, secret redaction, ISO timestamps, child logger factory.
   - `apps/api/src/lib/app-error.ts`: `AppError` custom class carrying HTTP status codes and machine-readable error codes.
   - `apps/api/src/lib/response.ts`: Standardized envelope helpers (`sendSuccess`, `sendError`).

2. **Request Correlation & Logging Middleware** (`3040f09`)
   - `apps/api/src/middleware/request-id.ts`: `requestId` middleware assigning UUID v4 correlation IDs (respects `X-Request-Id`).
   - `apps/api/src/middleware/request-logger.ts`: `pino-http` middleware logging method, path, status, and duration.
   - `apps/api/src/types/express.d.ts`: Express `Request` type augmentation for `id` and `log`.

3. **Validation & Error Handling Middleware** (`b755adc`)
   - `apps/api/src/middleware/error-handler.ts`: Centralized error handler distinguishing `AppError` from 500s.
   - `apps/api/src/middleware/not-found.ts`: Standardized 404 handler for unmatched routes.
   - `apps/api/src/middleware/validate.ts`: Generic Zod schema validation middleware for `body`, `params`, `query`.

4. **Health & Readiness Endpoints** (`f92910b`)
   - `apps/api/src/controllers/health.controller.ts`: Consolidated `/health` endpoint checking process, PostgreSQL, and MinIO.
   - `apps/api/src/routes/health.routes.ts`: Mapped `GET /health`.
   - `apps/api/src/routes/index.ts`: Route index mounting all routes under `/api/v1`.

5. **Express App & Server Bootstrap Restructuring** (`f2f543a`)
   - `apps/api/src/app.ts`: Middleware chain wired in order (helmet, cors, json body parsing, requestId, requestLogger, `/api/v1` routes, 404, errorHandler).
   - `apps/api/src/server.ts`: Startup connection retry for PostgreSQL (exponential backoff) and graceful shutdown (`SIGINT`/`SIGTERM`) with 10s timeout.
   - `apps/api/package.json`: Added `engines` block and registered `pino`, `pino-http`, `zod`, `helmet`, `cors`, `express-rate-limit`.

6. **Environment Security** (`9489f12`)
   - `.env.example`: Replaced plaintext passwords with secure placeholder strings.

7. **Backlog & Agent Handoff Infrastructure** (`fe38cf0`)
   - `backlog/STATUS.md`: Tracking progress and technical decisions.

8. **Swagger UI & OpenAPI 3.1 Specification** (`056a2bb`)
   - `apps/api/src/config/swagger.ts`: `zod-to-openapi` registry with JWT and API Key security schemes.
   - `apps/api/src/routes/docs.routes.ts`: Interactive Swagger UI at `/api/v1/docs` and raw specification at `/api/v1/openapi.json`.

9. **TypeScript Compiler Hardening** (`ce3c2b6`)
   - `apps/api/tsconfig.json`: Added path aliases for `@s3forge/config` and `@s3forge/database`, enabled `noImplicitAny`.

10. **Resilient MinIO Client Wrapper** (`e598739`)
    - `apps/api/src/lib/minio-client.ts`: Exponential backoff with random jitter, transient network error detection, wrapped SDK methods.

11. **Storage Zod Validators** (`fccb0de`)
    - `apps/api/src/validators/storage.validators.ts`: Zod schemas for `CreateBucketSchema`, `BucketNameParamSchema`, and `ListBucketsQuerySchema` with OpenAPI metadata.

12. **Bucket Repository Layer** (`f80bb9c`)
    - `apps/api/src/repositories/bucket.repository.ts`: Drizzle ORM operations on `buckets` table with soft delete and org filtering.

13. **Storage Service Layer** (`ecfc6db`)
    - `apps/api/src/services/storage.service.ts`: Business logic for bucket CRUD, org-prefixing (`org1-{name}`), and compensation rollback logic.

14. **Storage Controller Layer** (`5df57e7`)
    - `apps/api/src/controllers/storage.controller.ts`: Thin HTTP orchestration delegating to `storageService`.

15. **Storage Routes Refactoring & OpenAPI Paths** (`42de038`)
    - `apps/api/src/routes/storage.routes.ts`: Fully refactored router using Zod validation middleware and registered with `openApiRegistry`.

16. **pnpm Workspace Config Update** (`85bd807`)
    - `pnpm-workspace.yaml`: Moved `onlyBuiltDependencies` to workspace file for pnpm 11 compatibility.

17. **pinoHttp ESM Import Fix** (`82a650d`)
    - `apps/api/src/middleware/request-logger.ts`: Switched to named import `import { pinoHttp } from 'pino-http'` for TypeScript NodeNext ESM compatibility.

18. **TypeScript Monorepo Compilation Fixes** (`32bc702`)
    - `apps/api/tsconfig.json`: Fixed `noImplicitAny` compiler flag name and removed `rootDir` restriction to allow workspace package source resolution.
    - `apps/api/src/controllers/storage.controller.ts`: Type-safe string array narrowing for Express 5 params without type casting or `as any`.

19. **Health Route Refactoring** (`0516f61`)
    - Consolidated process, PostgreSQL, and MinIO checks into a single `GET /api/v1/health` endpoint and deleted `/ready` dead code.

20. **Developer Documentation** (`7c6aa4f`)
    - Created `dev_docs/getting-started.md`, `dev_docs/architecture.md`, and `dev_docs/api-conventions.md` explaining codebase structure, layers, and conventions.

21. **S3 Access Credentials Management (Phase 3)** (`e248175`)
    - `apps/api/src/lib/credential-generator.ts`: High-entropy keypair generator with timing-safe SHA-256 secret hashing.
    - `apps/api/src/validators/credential.validators.ts`: Zod schemas registered with OpenAPI.
    - `apps/api/src/repositories/s3-credential.repository.ts`: Drizzle ORM repository for `s3_credentials` table.
    - `apps/api/src/services/credential.service.ts`: Business logic returning secret key **only once** upon initial generation.
    - `apps/api/src/controllers/credential.controller.ts` & `apps/api/src/routes/credential.routes.ts`: Mounted `/api/v1/credentials` (POST create, GET list, GET :id, PATCH :id/revoke, DELETE :id).

22. **Authentication System & OpenAPI Integration (Phase 4.1)** (`28e845b`)
    - `apps/api/src/lib/password.ts`: scrypt password hashing & verification.
    - `apps/api/src/lib/jwt.ts`: HMAC-SHA256 JWT token signing & verification.
    - `apps/api/src/repositories/user.repository.ts`: User & organization transactional setup.
    - `apps/api/src/middleware/authenticate.ts`: Middleware supporting Bearer JWTs and `X-S3Forge-Access-Key` headers.
    - `apps/api/src/routes/auth.routes.ts`: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`.

23. **Storage Usage Snapshots & Metrics (Phase 4.2)** (`7357240`)
    - `apps/api/src/repositories/usage-snapshot.repository.ts`: Drizzle repository for `usage_snapshots` table.
    - `apps/api/src/services/usage.service.ts`: MinIO object stream scanner for calculating object count and total byte size per bucket and organization-wide.
    - `apps/api/src/controllers/usage.controller.ts` & `apps/api/src/routes/storage.routes.ts`: Mounted `GET /storage/usage`, `GET /storage/buckets/:name/usage`, `POST /storage/buckets/:name/usage/recalculate`.

---

## 3. Pending & Active Backlog Tasks

### Phase 4 — Multi-Tenant Features & Observability
- [x] **Task 4.1:** Authentication system & API key verification middleware.
- [x] **Task 4.2:** Usage Snapshots & Metrics API.
- [ ] **Task 4.3:** Audit log table & middleware recorder.

---

## 4. Guidelines for Handoff Agents
1. **Spiral SDLC:** Complete 1 feature at a time. Make clean, descriptive git commits per feature.
2. **Strict ESM rules:** TypeScript file imports must include `.js` extension (e.g., `import { logger } from '../lib/logger.js'`).
3. **Validation & Errors:** Every new endpoint must use Zod schemas via `validate()` middleware and throw `AppError` for domain errors.
4. **Never bypass layers:** Routes -> Middleware/Validator -> Controller -> Service -> Repository / MinIO Client.
