# Production Dockerfile for S3Forge Monorepo API Service
FROM node:22-alpine

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy pnpm workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source code across packages
COPY packages/config ./packages/config
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Typecheck and build verification
RUN pnpm --filter @s3forge/api build

EXPOSE 3000

ENV NODE_ENV=production

# Start API service using tsx with full monorepo path resolution
CMD ["pnpm", "--filter", "@s3forge/api", "exec", "tsx", "src/server.ts"]
