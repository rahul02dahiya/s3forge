import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { constants } from '@s3forge/config';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { requestTimeout } from './middleware/timeout.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || constants.SERVER.DEFAULT_CORS_ORIGIN,
  credentials: true,
}));

// --- Body parsing ---
app.use(express.json({ limit: constants.SERVER.BODY_LIMIT }));

// --- Request tracking & timeout ---
app.use(requestId);
app.use(requestLogger);
app.use(requestTimeout);

// --- API routes (all under /api/v1) ---
app.use('/api/v1', apiRouter);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

export default app;
