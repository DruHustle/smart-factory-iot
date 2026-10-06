ALTER TABLE "sensor_readings" ADD COLUMN "assetId" varchar(128);--> statement-breakpoint
CREATE INDEX "sensor_readings_asset_timestamp_idx" ON "sensor_readings" USING btree ("assetId","timestamp");