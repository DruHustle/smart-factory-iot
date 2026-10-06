ALTER TABLE "alerts" ADD COLUMN "errorCode" varchar(64) DEFAULT 'SF-SYS-000' NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "assignedToId" integer;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "assignedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "downtimeStartedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "resolvedById" integer;--> statement-breakpoint
UPDATE "alerts" SET "errorCode" = CASE
	WHEN "type" = 'threshold_exceeded' THEN 'SF-THR-' || CASE "metric" WHEN 'temperature' THEN 'TEMP' WHEN 'humidity' THEN 'HUM' WHEN 'vibration' THEN 'VIB' WHEN 'power' THEN 'POWER' WHEN 'pressure' THEN 'PRESS' WHEN 'rpm' THEN 'RPM' ELSE 'OTHER' END || '-' || CASE "severity" WHEN 'critical' THEN 'CRIT' WHEN 'warning' THEN 'WARN' ELSE 'INFO' END
	WHEN "type" = 'device_offline' THEN 'SF-COMM-001'
	WHEN "type" = 'firmware_update' THEN 'SF-FW-001'
	WHEN "type" = 'maintenance_required' THEN 'SF-MAINT-001'
	ELSE 'SF-SYS-001'
END;--> statement-breakpoint
UPDATE "alerts" SET "downtimeStartedAt" = "createdAt" WHERE "type" = 'device_offline';--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_assignedToId_users_id_fk" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolvedById_users_id_fk" FOREIGN KEY ("resolvedById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
