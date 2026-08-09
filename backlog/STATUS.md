# S3Forge Project Backlog & Agent Handoff

> **Branch:** `feat/backend-foundation`  
> **Last Updated:** 2026-08-09  
> **Status:** Phase 1 Foundation active, preparing Swagger + Storage Core

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
   - `apps/api/src/controllers/health.controller.ts`: Separated `/health` (liveness) from `/ready` (PostgreSQL + MinIO connectivity probes with timing).
   - `apps/api/src/routes/health.routes.ts`: Routes mapped cleanly.
   - `apps/api/src/routes/index.ts`: Route index mounting all routes under `/api/v1`.

5. **Express App & Server Bootstrap Restructuring** (`f2f543a`)
   - `apps/api/src/app.ts`: Middleware chain wired in order (helmet, cors, json body parsing, requestId, requestLogger, `/api/v1` routes, 404, errorHandler).
   - `apps/api/src/server.ts`: Startup connection retry for PostgreSQL (exponential backoff) and graceful shutdown (`SIGINT`/`SIGTERM`) with 10s timeout.
   - `apps/api/package.json`: Added `engines` block and registered `pino`, `pino-http`, `zod`, `helmet`, `cors`, `express-rate-limit`.

6. **Environment Security** (`9489f12`)
   - `.env.example`: Replaced plaintext passwords with secure placeholder strings.

---

## 3. Pending & Active Backlog Tasks

### Phase 1 Remaining — OpenAPI & Documentation
- [ ] **Task 1.1:** Add Swagger / OpenAPI integration using `@asteasolutions/zod-to-openapi` and `swagger-ui-express` (`config/swagger.ts`). Mount `/api/v1/docs` and `/api/v1/openapi.json`.
- [ ] **Task 1.2:** Add tsconfig paths alias or build config for `@s3forge/*` packages in `apps/api/tsconfig.json` to ensure clean compilation.

### Phase 2 — Storage Core (Refactoring & Clean Layering)
- [ ] **Task 2.1:** Resilient MinIO Client Wrapper (`lib/minio-client.ts`) with retry logic & timeouts for network errors.
- [ ] **Task 2.2:** Zod Schemas for Storage endpoints (`validators/storage.validators.ts`) — bucket creation, name params, pagination query.
- [ ] **Task 2.3:** Bucket Repository (`repositories/bucket.repository.ts`) — Drizzle ORM operations (`buckets` table), filtering `is_deleted = false`.
- [ ] **Task 2.4:** Storage Service (`services/storage.service.ts`) — Business logic for bucket CRUD, organization scoping, MinIO bucket naming sync.
- [ ] **Task 2.5:** Storage Controller (`controllers/storage.controller.ts`) — Extract validated inputs, invoke service, return response envelope.
- [ ] **Task 2.6:** Storage Routes (`routes/storage.routes.ts`) — Refactor routes to use Zod `validate()` middleware and new storage controller. Register endpoints with OpenAPI registry.

### Phase 3 — S3 Access Credentials
- [ ] **Task 3.1:** MinIO Admin Client wrapper for service account / policy management.
- [ ] **Task 3.2:** S3 Credential Repository & Service (`s3_credentials` table).
- [ ] **Task 3.3:** Credential Generation & Revocation Controller/Routes (`/api/v1/credentials`).

### Phase 4 — Multi-Tenant Features & Observability
- [ ] **Task 4.1:** Authentication system (JWT in httpOnly cookies + API key verification middleware).
- [ ] **Task 4.2:** Usage Snapshots cron background worker.
- [ ] **Task 4.3:** Audit log table & middleware recorder.

---

## 4. Guidelines for Handoff Agents
1. **Spiral SDLC:** Complete 1 feature at a time. Make clean, descriptive git commits per feature (e.g. `feat(api): ...` or `refactor(storage): ...`).
2. **Strict ESM rules:** TypeScript file imports must include `.js` extension (e.g., `import { logger } from '../lib/logger.js'`).
3. **Validation & Errors:** Every new endpoint must use Zod schemas via `validate()` middleware and throw `AppError` for domain errors.
4. **Never bypass layers:** Routes -> Middleware/Validator -> Controller -> Service -> Repository / MinIO Client.
