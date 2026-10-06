ALTER TABLE "alerts" ADD COLUMN "assetId" varchar(128);--> statement-breakpoint
ALTER TABLE "sensor_readings" ADD COLUMN "ingestionId" varchar(64);--> statement-breakpoint
CREATE INDEX "sensor_readings_device_timestamp_idx" ON "sensor_readings" USING btree ("deviceId","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "sensor_readings_ingestion_id_unique" ON "sensor_readings" USING btree ("ingestionId");