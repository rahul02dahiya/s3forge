import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "@s3forge/config";

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
