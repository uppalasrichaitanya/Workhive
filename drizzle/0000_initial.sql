CREATE TABLE IF NOT EXISTS "jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source" text NOT NULL,
  "source_job_id" text,
  "canonical_url" text NOT NULL,
  "title" text NOT NULL,
  "company" text NOT NULL,
  "location" text NOT NULL DEFAULT 'India',
  "description" text NOT NULL DEFAULT '',
  "employment_type" text,
  "remote" boolean NOT NULL DEFAULT false,
  "salary_min" integer,
  "salary_max" integer,
  "salary_currency" text,
  "posted_at" timestamptz,
  "first_seen_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  "content_hash" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "raw_payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_source_source_job_id_idx" ON "jobs" ("source", "source_job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_canonical_url_idx" ON "jobs" ("canonical_url");
CREATE INDEX IF NOT EXISTS "jobs_company_idx" ON "jobs" ("company");
CREATE INDEX IF NOT EXISTS "jobs_location_idx" ON "jobs" ("location");
CREATE INDEX IF NOT EXISTS "jobs_posted_at_idx" ON "jobs" ("posted_at");
CREATE INDEX IF NOT EXISTS "jobs_last_seen_at_idx" ON "jobs" ("last_seen_at");
CREATE INDEX IF NOT EXISTS "jobs_is_active_idx" ON "jobs" ("is_active");
CREATE TABLE IF NOT EXISTS "ingestion_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source" text NOT NULL,
  "dataset_id" text,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "item_count" integer NOT NULL DEFAULT 0,
  "inserted_count" integer NOT NULL DEFAULT 0,
  "updated_count" integer NOT NULL DEFAULT 0,
  "rejected_count" integer NOT NULL DEFAULT 0,
  "error_message" text
);
