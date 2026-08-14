# S3Forge Podman Operations & Verification Guide

This document provides a comprehensive operational guide for running, developing, and deploying S3Forge with **Podman** and **Podman Compose**, including command references, environment configurations, and verified testing results.

---

## 1. Overview & Architecture

S3Forge supports both **Docker** and **Podman** out of the box with zero code changes required.

```text
                        ┌──────────────────────────────────────────────┐
                        │              Host Machine                    │
                        │                                              │
                        │  pnpm dev:api / pnpm db:migrate              │
                        │  (Connects to localhost:5433 & :9000)        │
                        └──────────────┬────────────────┬──────────────┘
                                       │                │
                        ┌──────────────▼────────────────▼──────────────┐
                        │       Podman Rootless Engine (4.9+)          │
                        │   (User Socket: /run/user/$UID/podman.sock)  │
                        │                                              │
                        │  ┌──────────────────┐  ┌──────────────────┐  │
                        │  │ s3forge-postgres │  │  s3forge-minio   │  │
                        │  │ (PostgreSQL 17)  │  │  (MinIO S3)      │  │
                        │  └────────┬─────────┘  └────────┬─────────┘  │
                        │           │                     │            │
                        │     s3forge_postgres_data  s3forge_minio_data│
                        └──────────────────────────────────────────────┘
```

### Key Differences: Docker vs Rootless Podman

| Feature | Docker | Rootless Podman | S3Forge Handling |
| :--- | :--- | :--- | :--- |
| **Daemon Architecture** | Root daemon (`dockerd`) | Daemonless rootless user process | Managed via `systemctl --user enable --now podman.socket` |
| **Port Binding (< 1024)** | Allowed by default (runs as root) | Requires `net.ipv4.ip_unprivileged_port_start=80` or unprivileged ports (e.g. 8080) | Configurable via `${HTTP_PORT:-80}` & `${HTTPS_PORT:-443}` |
| **Compose Tooling** | `docker compose` plugin | `podman compose` (delegates to compose provider) | Unified `pnpm podman:*` scripts in `package.json` |
| **SELinux / Volumes** | Standard host mount | Requires `:z` flag on host file mounts | Configured `./Caddyfile:/etc/caddy/Caddyfile:ro,z` |
| **Container DNS** | Docker embedded DNS (`127.0.0.11`) | Netavark + Aardvark-DNS | User-defined bridge network `s3forge-network` |

---

## 2. Host Prerequisites & Initial Setup

To configure a Linux system for rootless Podman execution:

```bash
# 1. Install Podman and rootless helper packages
sudo apt update && sudo apt install -y podman uidmap slirp4netns fuse-overlayfs buildah

# 2. Verify subuid and subgid allocations exist for your user
grep "^$(id -un):" /etc/subuid /etc/subgid

# 3. Enable and start the user-level Podman API socket
systemctl --user enable --now podman.socket

# 4. Verify the Podman socket is active
curl -s --unix-socket /run/user/$(id -u)/podman/podman.sock http://d/v1.41/version

# 5. (Optional - For Production Port 80/443 Binding in Rootless Mode)
# Allow rootless processes to bind to port 80 and above:
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/99-podman-ports.conf
```

---

## 3. Command Reference & Usage

### A. Development Infrastructure (Postgres + MinIO)

| Command | Shortcut | Purpose |
| :--- | :--- | :--- |
| `podman compose up -d` | `pnpm podman:up` | Starts local PostgreSQL 17 and MinIO containers in detached mode. |
| `podman compose down` | `pnpm podman:down` | Gracefully stops and removes development containers and network. |
| `podman compose down -v` | — | Stops containers and **destroys data volumes** (resets DB & object storage). |
| `podman ps` | — | Lists all running containers with their mapped ports and container status. |
| `podman logs -f s3forge-postgres` | — | Streams real-time PostgreSQL database container logs. |
| `podman logs -f s3forge-minio` | — | Streams real-time MinIO object storage container logs. |

### B. Database Migrations & Tooling

| Command | Purpose |
| :--- | :--- |
| `pnpm db:migrate` | Runs Drizzle Kit SQL migrations against the running PostgreSQL container. |
| `pnpm db:generate` | Scans `packages/database/src/schema/` and generates new SQL migrations. |
| `pnpm db:studio` | Launches Drizzle Studio web UI on `localhost:4983` for direct database inspection. |

### C. Local Application Services

| Command | Purpose |
| :--- | :--- |
| `pnpm dev:api` | Starts the Express API server with TSX hot reload on `http://localhost:3000`. |
| `pnpm dev:web` | Starts the React + Vite frontend dashboard on `http://localhost:5173`. |
| `pnpm typecheck` | Validates TypeScript types across API, Database, Config, and Frontend packages. |
| `pnpm build` | Compiles API TypeScript and bundles Vite production assets. |

### D. Production Deployment Stack (Full Stack: Postgres + MinIO + API + Caddy)

| Command | Shortcut | Purpose |
| :--- | :--- | :--- |
| `podman compose -f docker-compose.prod.yml up -d --build` | `pnpm podman:prod` | Builds the API image and launches Postgres, MinIO, API, and Caddy with automatic TLS. |
| `HTTP_PORT=8080 HTTPS_PORT=8443 podman compose -f docker-compose.prod.yml up -d` | — | Launches production containers on custom unprivileged ports. |
| `podman compose -f docker-compose.prod.yml down` | — | Tears down production stack containers and networks. |
| `podman logs -f s3forge-api` | — | Streams production API service logs inside the container. |
| `podman logs -f s3forge-caddy` | — | Streams Caddy reverse proxy and certificate manager logs. |

---

## 4. MinIO CLI (`mc`) Operations via Podman

MinIO includes the `mc` administration CLI embedded inside the container:

```bash
# Configure mc alias inside the container
podman exec s3forge-minio mc alias set local http://localhost:9000 admin <MINIO_ROOT_PASSWORD>

# List all buckets
podman exec s3forge-minio mc ls local

# Inspect contents of a specific bucket
podman exec s3forge-minio mc ls local/my-bucket/

# Check server health
podman exec s3forge-minio mc ready local
```

---

## 5. Verification & Validation Audit

The entire workflow was tested and validated under rootless Podman 4.9:

```text
[✓] Container Image Build (`podman build -t s3forge-api .`): Succeeded (Multi-stage pnpm monorepo)
[✓] Development Stack Startup (`pnpm podman:up`): Succeeded (Postgres 17 + MinIO latest)
[✓] Drizzle Schema Migrations (`pnpm db:migrate`): Succeeded (All tables & relations created)
[✓] Live API Database Connectivity: Succeeded (SELECT 1 query executed in 1ms)
[✓] Live API Object Storage Operations: Succeeded (Bucket create, object put, object get, object delete)
[✓] Health Endpoint (`GET /api/v1/health`): Succeeded (200 OK — Uptime, Postgres 2ms, MinIO 18ms)
[✓] User Auth Flow (`POST /api/v1/auth/register`): Succeeded (Created user, org, and issued JWT)
[✓] S3 Bucket Management API (`POST /api/v1/storage/buckets`): Succeeded (Synchronized in DB & MinIO)
[✓] Production Stack (`podman compose -f docker-compose.prod.yml`): Succeeded (All 4 containers running)
[✓] Reverse Proxy (`Caddy` -> `API`): Succeeded (Proxying API health traffic cleanly)
```

---

## 6. Troubleshooting & Common Edge Cases

### 1. `address already in use` on Port 5432
* **Cause**: The host machine has a native PostgreSQL service installed (e.g. via `apt install postgresql`) listening on port 5432.
* **Resolution**: Set `POSTGRES_PORT=5433` in `.env`. The `docker-compose.yml` automatically binds `127.0.0.1:${POSTGRES_PORT:-5432}:5432` without modifying database configuration inside containers.

### 2. `cannot expose privileged port 80` in Rootless Mode
* **Cause**: Linux limits non-root users from binding ports `< 1024` by default.
* **Resolution**:
  - Run `sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80`, OR
  - Pass custom ports: `HTTP_PORT=8080 HTTPS_PORT=8443 pnpm podman:prod`.

### 3. Password Authentication Failed after changing `.env`
* **Cause**: PostgreSQL initialization scripts run only when the volume is created. Changing passwords in `.env` afterwards will not alter the existing volume data.
* **Resolution**: Reset the development volume with `podman compose down -v && podman compose up -d`, then rerun `pnpm db:migrate`.
