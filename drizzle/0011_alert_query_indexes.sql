CREATE INDEX "alert_thresholds_device_id_idx" ON "alert_thresholds" USING btree ("deviceId");--> statement-breakpoint
CREATE INDEX "alerts_status_created_at_idx" ON "alerts" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "alerts_assignee_status_idx" ON "alerts" USING btree ("assignedToId","status");