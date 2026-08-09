import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

import { constants } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

// Load the .env file from process cwd (root) or relative path
const cwdEnvPath = path.resolve(process.cwd(), '.env');
const relativeEnvPath = path.resolve(__dirname, '../../../.env');
const envPath = fs.existsSync(cwdEnvPath) ? cwdEnvPath : relativeEnvPath;

dotenv.config({ path: envPath });

// Helper to ensure env variables exist
function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const env = {
  nodeEnv,

  port: Number(process.env.PORT || constants.SERVER.DEFAULT_PORT),

  jwtSecret: isProduction
    ? required('JWT_SECRET')
    : process.env.JWT_SECRET || 'super-secret-default-s3forge-key-change-in-production',

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
    accessKey: process.env.MINIO_SERVICE_ACCESS_KEY || process.env.MINIO_ROOT_USER || '',
    secretKey: process.env.MINIO_SERVICE_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || '',
  },
};

export function getDatabaseUrl(): string {
  const pg = env.postgres;

  return `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.database}`;
}
