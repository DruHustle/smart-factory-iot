ALTER TABLE "assets" ADD COLUMN "aasConceptDescriptions" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "aasxImported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "aasxPackageId" varchar(128);