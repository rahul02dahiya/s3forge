import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getDatabaseUrl } from "@s3forge/config";

const client = postgres(getDatabaseUrl());
export const db = drizzle(client);
