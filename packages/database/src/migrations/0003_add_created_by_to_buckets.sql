ALTER TABLE "buckets" ADD COLUMN IF NOT EXISTS "created_by" bigint;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'buckets_created_by_users_id_fk'
      AND conrelid = 'public.buckets'::regclass
  ) THEN
    ALTER TABLE "buckets"
      ADD CONSTRAINT "buckets_created_by_users_id_fk"
      FOREIGN KEY ("created_by")
      REFERENCES "public"."users"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END $$;
