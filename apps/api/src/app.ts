import express from "express";
import { db } from "./config/database.js";
import { sql } from "drizzle-orm";
import storageRoutes from './routes/storage.routes.js';

const app = express();

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use('/storage', storageRoutes);

export default app;
