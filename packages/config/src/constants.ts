import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CONSTANTS = {
  SERVER: {
    DEFAULT_PORT: 3000,
    DEFAULT_CORS_ORIGIN: 'http://localhost:5173',
    DEFAULT_APP_URL: 'http://localhost:5173',
    BODY_LIMIT: '1mb',
    SHUTDOWN_TIMEOUT_MS: 10_000,
    REQUEST_TIMEOUT_MS: 30_000,
    DB_CONNECT_MAX_RETRIES: 5,
    DB_CONNECT_BASE_DELAY_MS: 1_000,
  },
  WORKER: {
    SNAPSHOT_INTERVAL_MS: 60 * 60 * 1000,
    SNAPSHOT_INITIAL_DELAY_MS: 5000,
    SNAPSHOT_MAX_RETRIES: 3,
    SNAPSHOT_RETRY_DELAY_MS: 1000,
  },
  AUTH: {
    JWT_EXPIRES_IN_SECONDS: 7 * 24 * 60 * 60,
    PASSWORD_SALT_BYTES: 16,
    PASSWORD_KEY_LEN: 64,
    ACCESS_KEY_PREFIX: 'S3F',
  },
  STORAGE: {
    ROOT_BUCKET_NAME: 's3forge-storage',
    DEFAULT_REGION: 'us-east-1',
    DEFAULT_PRESIGNED_EXPIRY_SECONDS: 3600,
    MIN_PRESIGNED_EXPIRY_SECONDS: 60,
    MAX_PRESIGNED_EXPIRY_SECONDS: 604800,
    MAX_BATCH_DELETE_SIZE: 1000,
    BUCKET_NAME_REGEX: /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/,
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_OBJECT_LIMIT: 100,
    MAX_OBJECT_LIMIT: 1000,
    DEFAULT_AUDIT_LIMIT: 50,
  },
  MAIL: {
    DEFAULT_HOST: 'smtp.gmail.com',
    DEFAULT_PORT: 587,
    DEFAULT_SECURE: false,
    RESET_TOKEN_EXPIRY_SECONDS: 3600,
  },
  RATE_LIMIT: {
    FORGOT_PASSWORD_WINDOW_MS: 15 * 60 * 1000,
    FORGOT_PASSWORD_LIMIT: 3,
    RESET_PASSWORD_WINDOW_MS: 15 * 60 * 1000,
    RESET_PASSWORD_LIMIT: 5,
  },
};

export type AppConstants = typeof DEFAULT_CONSTANTS;

function resolveJsonPath(): string | null {
  if (process.env.CONSTANTS_FILE_PATH && fs.existsSync(process.env.CONSTANTS_FILE_PATH)) {
    return process.env.CONSTANTS_FILE_PATH;
  }
  const rootPath = path.resolve(__dirname, '../../../constants.json');
  if (fs.existsSync(rootPath)) return rootPath;

  const cwdPath = path.resolve(process.cwd(), 'constants.json');
  if (fs.existsSync(cwdPath)) return cwdPath;

  return null;
}

function parseJsonFile(filePath: string): AppConstants {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      SERVER: { ...DEFAULT_CONSTANTS.SERVER, ...parsed.SERVER },
      WORKER: { ...DEFAULT_CONSTANTS.WORKER, ...parsed.WORKER },
      AUTH: { ...DEFAULT_CONSTANTS.AUTH, ...parsed.AUTH },
      STORAGE: {
        ...DEFAULT_CONSTANTS.STORAGE,
        ...parsed.STORAGE,
        BUCKET_NAME_REGEX: parsed.STORAGE?.BUCKET_NAME_REGEX
          ? new RegExp(parsed.STORAGE.BUCKET_NAME_REGEX)
          : DEFAULT_CONSTANTS.STORAGE.BUCKET_NAME_REGEX,
      },
      PAGINATION: { ...DEFAULT_CONSTANTS.PAGINATION, ...parsed.PAGINATION },
      MAIL: { ...DEFAULT_CONSTANTS.MAIL, ...parsed.MAIL },
      RATE_LIMIT: { ...DEFAULT_CONSTANTS.RATE_LIMIT, ...parsed.RATE_LIMIT },
    };
  } catch {
    return DEFAULT_CONSTANTS;
  }
}

// Single in-memory object instance for zero-allocation property access
export const constants: AppConstants = {
  SERVER: { ...DEFAULT_CONSTANTS.SERVER },
  WORKER: { ...DEFAULT_CONSTANTS.WORKER },
  AUTH: { ...DEFAULT_CONSTANTS.AUTH },
  STORAGE: { ...DEFAULT_CONSTANTS.STORAGE },
  PAGINATION: { ...DEFAULT_CONSTANTS.PAGINATION },
  MAIL: { ...DEFAULT_CONSTANTS.MAIL },
  RATE_LIMIT: { ...DEFAULT_CONSTANTS.RATE_LIMIT },
};

// Initial synchronous load
const jsonPath = resolveJsonPath();
if (jsonPath) {
  Object.assign(constants, parseJsonFile(jsonPath));

  // Non-blocking OS event watcher: updates in-memory `constants` ONLY when constants.json changes
  try {
    fs.watch(jsonPath, () => {
      Object.assign(constants, parseJsonFile(jsonPath));
    });
  } catch {
    console.debug("fs.watch failed. Unable to reload constant json")
  }
}
