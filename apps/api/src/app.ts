import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env, constants } from '@s3forge/config';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { requestTimeout } from './middleware/timeout.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';
import s3GatewayRoutes from './routes/s3-gateway.routes.js';

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
}));

// --- Request tracking & timeout ---
app.use(requestId);
app.use(requestLogger);
app.use(requestTimeout);

// --- S3-compatible gateway routes ---
// Mounted before JSON body parsing so PUT object uploads can stream directly.
app.use(env.s3Gateway.basePath, s3GatewayRoutes);

// --- Body parsing ---
app.use(express.json({ limit: constants.SERVER.BODY_LIMIT }));

// --- API routes (all under /api/v1) ---
app.use('/api/v1', apiRouter);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

export default app;
