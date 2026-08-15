# Developer Getting Started Guide

This document explains how to set up the local development environment, where configurations reside, and how to run and verify the S3Forge backend service.

---

## Prerequisites & Tooling

To work on S3Forge locally, ensure you have the following installed on your system:
- **Node.js** (v22 LTS or later)
- **pnpm** (v10 or later) for workspace dependency management
- **Docker & Docker Compose** for local database and object storage infrastructure

---

## Project Structure & Configuration Locations

- **Monorepo Root**: Houses workspace scripts, base configurations, and infrastructure settings (`docker-compose.yml`).
- **Backend Service (`apps/api`)**: Main Express.js API server.
- **Frontend App (`apps/web`)**: React user interface.
- **Shared Packages (`packages/`)**:
  - `packages/config`: Shared environment variable schemas and loaders.
  - `packages/database`: Shared Drizzle ORM database schemas, connection clients, and migration scripts.
- **Environment Configuration**: Key-value settings are defined in `.env.example` at the monorepo root. Copy this file to `.env` before starting services.

---

## Running Infrastructure Services

PostgreSQL 17 and MinIO are managed via Docker Compose defined in the root `docker-compose.yml`.

- **Start Infrastructure**: Run `docker compose up -d` in the root directory.
- **Service Endpoints**:
  - **PostgreSQL 17**: Accessible locally at `localhost:5432` for database `s3forge`.
  - **MinIO Console**: Web UI accessible at `http://localhost:9001` for managing buckets and inspecting object storage manually.
  - **MinIO S3 API**: S3-compatible API endpoint listening at `http://localhost:9000`.

---

## Database Management & Migrations

Database schemas are defined in `packages/database/src/schema/`.

- **Applying Migrations**: Run `pnpm db:migrate` from the root directory to execute all pending SQL migrations located in `packages/database/src/migrations/`.
- **Pushing Schema Directly**: Run `pnpm db:push` from the root directory to directly push schema updates to PostgreSQL during local development.
- **Database Studio**: Run `pnpm db:studio` to open an interactive web interface for inspecting and editing database records directly.

---

## Running the API Server

- **Development Mode**: Run `pnpm dev:api` from the root directory. This starts the Express server in watch mode under `apps/api`.
- **API Base URL**: All API routes are mounted under `http://localhost:3000/api/v1`.

---

## Verifying Setup

Once the API server is running, verify the setup by navigating to:
- **Interactive Documentation**: `http://localhost:3000/api/v1/docs` (Swagger UI rendering all endpoints and validation schemas).
- **OpenAPI Specification**: `http://localhost:3000/api/v1/openapi.json` (Machine-readable OpenAPI 3.1 specification).
- **Health Verification**: Send a `GET` request to `http://localhost:3000/api/v1/health` to confirm that process uptime, PostgreSQL connectivity, and MinIO connectivity are all operational.
