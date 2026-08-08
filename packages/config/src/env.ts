import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../../.env");

const result = dotenv.config({ path: envPath });
if (result.error) {
  throw result.error;
}

const required = [
  "PORT",
  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "MINIO_ROOT_USER",
  "MINIO_ROOT_PASSWORD",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  postgres: {
    host: process.env.POSTGRES_HOST!,
    port: Number(process.env.POSTGRES_PORT!),
    database: process.env.POSTGRES_DB!,
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
  },
  minio: {
    rootUser: process.env.MINIO_ROOT_USER!,
    rootPassword: process.env.MINIO_ROOT_PASSWORD!,
  },
};

export function getDatabaseUrl() {
  const url = new URL("postgres://localhost");
  url.username = env.postgres.user;
  url.password = env.postgres.password;
  url.hostname = env.postgres.host;
  url.port = String(env.postgres.port);
  url.pathname = `/${env.postgres.database}`;
  return url.toString();
}
