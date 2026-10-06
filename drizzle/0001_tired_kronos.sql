CREATE TYPE "public"."asset_lifecycle_stage" AS ENUM('planned', 'engineered', 'commissioned', 'operational', 'maintenance', 'decommissioned');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'viewer' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'operator' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'engineer' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "asset_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"deviceId" integer NOT NULL,
	"protocol" varchar(32) DEFAULT 'mqtt' NOT NULL,
	"endpoint" varchar(512),
	"tagMappings" json DEFAULT '[]'::json NOT NULL,
	"lastSeen" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_lifecycle_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"fromStage" "asset_lifecycle_stage",
	"toStage" "asset_lifecycle_stage" NOT NULL,
	"changedBy" integer NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"assetType" varchar(100) NOT NULL,
	"manufacturer" varchar(255),
	"model" varchar(255),
	"serialNumber" varchar(128),
	"location" varchar(255),
	"zone" varchar(100),
	"lifecycleStage" "asset_lifecycle_stage" DEFAULT 'planned' NOT NULL,
	"aasShell" json NOT NULL,
	"aasSubmodels" json DEFAULT '[]'::json NOT NULL,
	"isDemo" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_assetId_unique" UNIQUE("assetId")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "isDemo" boolean DEFAULT false NOT NULL;