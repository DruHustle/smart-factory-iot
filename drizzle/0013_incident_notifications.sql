CREATE TABLE "notification_inbox" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_inbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"alertId" integer NOT NULL,
	"userId" integer NOT NULL,
	"kind" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"readAt" timestamp with time zone,
	"emailStatus" varchar(32) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"nextAttemptAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastError" text,
	"acceptedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_inbox" ADD CONSTRAINT "notification_inbox_alertId_alerts_id_fk" FOREIGN KEY ("alertId") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_inbox" ADD CONSTRAINT "notification_inbox_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_inbox_user_created_idx" ON "notification_inbox" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "notification_inbox_delivery_idx" ON "notification_inbox" USING btree ("emailStatus","nextAttemptAt");
--> statement-breakpoint
CREATE FUNCTION queue_incident_notifications() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_kind text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.severity::text NOT IN ('critical', 'warning') THEN RETURN NEW; END IF;
    event_kind := 'incident';
  ELSIF NEW."assignedToId" IS DISTINCT FROM OLD."assignedToId" THEN
    event_kind := 'assignment';
  ELSIF NEW.status::text = 'resolved' AND OLD.status::text <> 'resolved' THEN
    event_kind := 'resolution';
  ELSIF NEW.severity::text = 'critical' AND OLD.severity::text <> 'critical' THEN
    event_kind := 'escalation';
  ELSE RETURN NEW;
  END IF;
  INSERT INTO notification_inbox ("alertId", "userId", kind, title, body)
  SELECT NEW.id, u.id, event_kind,
    CASE event_kind WHEN 'assignment' THEN 'Technician assignment changed' WHEN 'resolution' THEN 'Incident resolved' WHEN 'escalation' THEN 'Factory incident escalated: critical' ELSE 'Factory incident: ' || NEW.severity::text END,
    NEW."errorCode" || ' — ' || NEW.message || E'\nEvent #' || NEW.id || CASE WHEN NEW."assetId" IS NULL THEN '' ELSE E'\nAsset: ' || NEW."assetId" END
  FROM users u WHERE
    (event_kind IN ('incident','escalation') AND u.role::text IN ('admin','engineer')) OR
    (event_kind = 'assignment' AND (u.id = NEW."assignedToId" OR u.id = OLD."assignedToId" OR u.role::text = 'admin')) OR
    (event_kind = 'resolution' AND (u.id = NEW."assignedToId" OR u.role::text = 'admin'));
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER incident_notification_queue AFTER INSERT OR UPDATE ON alerts
FOR EACH ROW EXECUTE FUNCTION queue_incident_notifications();
