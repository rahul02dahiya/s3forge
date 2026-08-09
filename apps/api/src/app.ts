import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// --- Body parsing ---
app.use(express.json({ limit: '1mb' }));

// --- Request tracking ---
app.use(requestId);
app.use(requestLogger);

// --- API routes (all under /api/v1) ---
app.use('/api/v1', apiRouter);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

export default app;
