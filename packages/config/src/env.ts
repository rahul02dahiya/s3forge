import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the root .env file
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

// Helper to ensure env variables exist
function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',

  port: Number(process.env.PORT || 3000),

  jwtSecret: process.env.JWT_SECRET || 'super-secret-default-s3forge-key-change-in-production',

  postgres: {
    host: required('POSTGRES_HOST'),
    port: Number(required('POSTGRES_PORT')),
    database: required('POSTGRES_DB'),
    user: required('POSTGRES_USER'),
    password: required('POSTGRES_PASSWORD'),
  },

  minio: {
    endpoint: required('MINIO_ENDPOINT'),
    port: Number(required('MINIO_PORT')),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    rootUser: required('MINIO_ROOT_USER'),
    rootPassword: required('MINIO_ROOT_PASSWORD'),
  },
};

export function getDatabaseUrl(): string {
  const pg = env.postgres;

  return `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.database}`;
}
