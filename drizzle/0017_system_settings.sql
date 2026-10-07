CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" varchar(100) PRIMARY KEY,
  "value" jsonb NOT NULL,
  "updatedBy" integer NULL,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
