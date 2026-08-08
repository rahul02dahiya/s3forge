import { Client } from 'minio';
import { env } from '@s3forge/config';

export const minio = new Client({
  endPoint: env.minio.endpoint,
  port: env.minio.port,
  useSSL: env.minio.useSSL,
  accessKey: env.minio.rootUser,
  secretKey: env.minio.rootPassword,
});
