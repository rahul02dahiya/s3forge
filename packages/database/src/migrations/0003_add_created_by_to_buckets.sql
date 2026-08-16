ALTER TABLE "buckets" ADD COLUMN "created_by" bigint REFERENCES "users"("id") ON DELETE set null;
