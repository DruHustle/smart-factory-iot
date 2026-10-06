CREATE TABLE "login_rate_limits" (
	"key_hash" varchar(64) PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_rate_limits_reset_at_idx" ON "login_rate_limits" USING btree ("reset_at");