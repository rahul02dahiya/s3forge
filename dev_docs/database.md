# S3Forge Database Documentation

Developer documentation for the PostgreSQL and Drizzle ORM setup used by **S3Forge**.

---

## Overview

S3Forge uses **PostgreSQL 17** as its **control-plane database**.

The database stores:

* User accounts
* Organizations and memberships
* Bucket metadata
* S3 access credentials
* Storage usage snapshots
* Internal service health information

Actual **objects and bucket contents are stored in MinIO**, not in PostgreSQL.

---

## Technology Stack

| Component   | Version |
| ----------- | ------- |
| PostgreSQL  | 17      |
| Drizzle ORM | 0.44.x  |
| drizzle-kit | 0.31.x  |
| Node.js     | 22 LTS  |
| TypeScript  | 5.9+    |

---

## Package Location

```text
packages/database/
├── drizzle.config.ts
├── package.json
└── src/
    ├── index.ts
    ├── schema/
    └── migrations/
```

---

## Environment Variables

The database package reads environment variables from the **root `.env` file**.

### Required Variables

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=s3forge
POSTGRES_USER=admin
POSTGRES_PASSWORD=SuperSecretPassword123!
```

The shared config package is responsible for constructing the final connection URL.

---

## Database Schema

### Entity Relationship Overview

```text
organizations
    │
    ├── organization_members ─── users
    │
    ├── buckets
    │       └── usage_snapshots
    │
    └── s3_credentials

service_health
```

---

# Tables

## users

Stores dashboard user accounts.

### Columns

| Column        | Type        | Notes                      |
| ------------- | ----------- | -------------------------- |
| id            | bigint      | Auto-increment primary key |
| email         | text        | Unique                     |
| password_hash | text        | Hashed password            |
| display_name  | text        | User display name          |
| is_active     | boolean     | Account status             |
| created_at    | timestamptz | Creation timestamp         |
| updated_at    | timestamptz | Last update timestamp      |

### Notes

* Passwords must be stored using **Argon2id** (recommended) or **bcrypt**.
* Never store plain-text passwords.

---

## organizations

Represents a tenant or workspace.

### Columns

| Column     | Type        | Notes                      |
| ---------- | ----------- | -------------------------- |
| id         | bigint      | Auto-increment primary key |
| name       | text        | Organization name          |
| slug       | text        | Unique slug                |
| created_at | timestamptz | Creation timestamp         |

### Example

| id | name           | slug           |
| -- | -------------- | -------------- |
| 1  | Rahul Personal | rahul-personal |

---

## organization_members

Maps users to organizations.

### Columns

| Column          | Type        | Notes                  |
| --------------- | ----------- | ---------------------- |
| organization_id | bigint      | FK → organizations.id  |
| user_id         | bigint      | FK → users.id          |
| role            | text        | owner / admin / member |
| created_at      | timestamptz | Join timestamp         |

### Primary Key

Composite primary key:

```sql
(organization_id, user_id)
```

---

## buckets

Stores **metadata about MinIO buckets**.

### Columns

| Column            | Type        | Notes                             |
| ----------------- | ----------- | --------------------------------- |
| id                | bigint      | Auto-increment primary key        |
| organization_id   | bigint      | FK → organizations.id             |
| name              | text        | User-facing bucket name           |
| minio_bucket_name | text        | Actual MinIO bucket name (unique) |
| region            | text        | Default: us-east-1                |
| visibility        | text        | private / public                  |
| quota_bytes       | bigint      | Optional storage quota            |
| is_deleted        | boolean     | Soft delete flag                  |
| created_at        | timestamptz | Creation timestamp                |
| updated_at        | timestamptz | Last update timestamp             |

### Important

`name` and `minio_bucket_name` are intentionally separate to avoid global naming collisions.

Example:

| name   | minio_bucket_name |
| ------ | ----------------- |
| assets | org1-assets       |

---

## s3_credentials

Stores S3 access keys issued by S3Forge.

### Columns

| Column          | Type        | Notes                      |
| --------------- | ----------- | -------------------------- |
| id              | bigint      | Auto-increment primary key |
| organization_id | bigint      | FK → organizations.id      |
| access_key      | text        | Unique access key          |
| secret_key_hash | text        | Hashed secret key          |
| description     | text        | Optional description       |
| is_active       | boolean     | Credential status          |
| last_used_at    | timestamptz | Last usage timestamp       |
| created_at      | timestamptz | Creation timestamp         |

### Security Rules

* Show the **secret key only once** when generated.
* Store only the **hashed version** in PostgreSQL.
* Revoke credentials by setting `is_active = false`.

---

## usage_snapshots

Stores aggregated bucket usage information.

### Columns

| Column        | Type        | Notes                      |
| ------------- | ----------- | -------------------------- |
| id            | bigint      | Auto-increment primary key |
| bucket_id     | bigint      | FK → buckets.id            |
| object_count  | integer     | Number of objects          |
| total_bytes   | bigint      | Total storage used         |
| calculated_at | timestamptz | Snapshot timestamp         |

### Purpose

This table is used for:

* Dashboard usage charts
* Quota enforcement
* Capacity planning
* Storage growth tracking

S3Forge **does not store individual object records**.

---

## service_health

Stores lightweight operational health snapshots.

### Columns

| Column           | Type        | Notes                            |
| ---------------- | ----------- | -------------------------------- |
| id               | bigint      | Auto-increment primary key       |
| service_name     | text        | Service identifier               |
| status           | text        | healthy / degraded / unreachable |
| response_time_ms | integer     | Optional response time           |
| details          | jsonb       | Additional diagnostic data       |
| checked_at       | timestamptz | Health check timestamp           |

### Example

```json
{
  "service_name": "minio",
  "status": "healthy",
  "response_time_ms": 24,
  "details": {
    "version": "RELEASE.2026-08-01"
  }
}
```

---

# Drizzle Configuration

## drizzle.config.ts

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

# Schema Exports

`src/schema/index.ts` must export all schema files using **ESM `.js` extensions**:

```ts
export * from './users.js'
export * from './organizations.js'
export * from './organization-members.js'
export * from './buckets.js'
export * from './s3-credentials.js'
export * from './usage-snapshots.js'
export * from './service-health.js'
```

---

# Migration Workflow

## Generate Migration

Run from the repository root:

```bash
pnpm db:generate # from project root
```

This creates a new SQL file in:

```text
packages/database/src/migrations/
```

---

## Apply Migration

```bash
pnpm db:migrate # from project root
```

---

## Check Migration Status

```bash
docker exec -it s3forge-postgres psql -U admin -d s3forge -c "\dt"
```

---

# Development Workflow

## 1. Modify Schema

Edit files under:

```text
packages/database/src/schema/
```

---

## 2. Generate Migration

```bash
pnpm db:generate # from project root
```

---

## 3. Review Generated SQL

```bash
cat packages/database/src/migrations/*.sql
```

Always review generated SQL before applying it.

---

## 4. Apply Migration

```bash
pnpm db:migrate # from project root
```

---

## 5. Commit Changes

```bash
git commit -m "feat(db): describe schema change"
```

---

# Resetting the Local Database

For early development only:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate # from project root # from project root
```

Warning --> `-v` removes all PostgreSQL data volumes.

---

# Design Decisions

## Why `bigserial`?

S3Forge uses `bigserial` instead of UUIDs because it provides:

* Smaller indexes
* Faster joins
* Easier debugging
* Simpler SQL queries
* Better developer ergonomics for an internal control-plane database

---

## Why No Object Table?

MinIO is already responsible for:

* Object metadata
* Versioning
* Multipart uploads
* Lifecycle management
* Replication state

Duplicating object records in PostgreSQL would create synchronization complexity and unnecessary storage overhead.

---

## Why Organizations?

Even though S3Forge is free and self-hosted, organizations provide a **multi-tenant-ready architecture** with minimal additional complexity.

This allows future support for:

* Team collaboration
* Shared bucket management
* Multiple administrators
* Separate application environments

---

# Monitoring Strategy

## Stored in PostgreSQL

* `usage_snapshots`
* `service_health`

## Not Stored in PostgreSQL

High-frequency operational metrics should be handled by external tools such as:

* Prometheus
* Grafana
* cAdvisor
* Node Exporter

This keeps the application database small and efficient.

---

# Current Schema Summary

| Table                | Purpose                    |
| -------------------- | -------------------------- |
| users                | Dashboard users            |
| organizations        | Tenant/workspace           |
| organization_members | User membership and roles  |
| buckets              | MinIO bucket metadata      |
| s3_credentials       | S3 access credentials      |
| usage_snapshots      | Storage usage aggregation  |
| service_health       | Internal health monitoring |

---

# Useful Commands

## Start Infrastructure

```bash
docker compose up -d
```

## Generate Migration

```bash
pnpm db:generate # from project root
```

## Apply Migration

```bash
pnpm db:migrate # from project root
```

## Open PostgreSQL Shell

```bash
docker exec -it s3forge-postgres psql -U admin -d s3forge
```

## List Tables

```sql
\dt
```

## Describe a Table

```sql
\d users
```

---

# Future Extensions

Potential future schema additions:

* `bucket_policies`
* `api_tokens`
* `webhooks`
* `audit_logs`
* `background_jobs`
* `notification_rules`

These are intentionally **out of scope for v0.1** to keep the initial database design simple and maintainable.

---

## Status

This document reflects the **S3Forge v0.1 database architecture** and should be updated whenever schema changes are introduced through new Drizzle migrations.
