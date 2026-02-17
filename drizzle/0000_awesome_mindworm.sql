CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('active', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('threshold_exceeded', 'device_offline', 'firmware_update', 'maintenance_required', 'system_error');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('online', 'offline', 'maintenance', 'error');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('sensor', 'actuator', 'controller', 'gateway');--> statement-breakpoint
CREATE TYPE "public"."metric" AS ENUM('temperature', 'humidity', 'vibration', 'power', 'pressure', 'rpm');--> statement-breakpoint
CREATE TYPE "public"."ota_status" AS ENUM('pending', 'downloading', 'installing', 'completed', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "alert_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" integer NOT NULL,
	"metric" "metric" NOT NULL,
	"minValue" real,
	"maxValue" real,
	"warningMin" real,
	"warningMax" real,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" integer NOT NULL,
	"type" "alert_type" NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"metric" varchar(50),
	"value" real,
	"threshold" real,
	"message" text NOT NULL,
	"status" "alert_status" DEFAULT 'active' NOT NULL,
	"acknowledgedBy" integer,
	"acknowledgedAt" timestamp with time zone,
	"resolvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "device_type" NOT NULL,
	"status" "device_status" DEFAULT 'offline' NOT NULL,
	"location" varchar(255),
	"zone" varchar(100),
	"firmwareVersion" varchar(50),
	"lastSeen" timestamp with time zone,
	"metadata" json,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_deviceId_unique" UNIQUE("deviceId")
);
--> statement-breakpoint
CREATE TABLE "firmware_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(50) NOT NULL,
	"deviceType" "device_type" NOT NULL,
	"releaseNotes" text,
	"fileUrl" varchar(512),
	"fileSize" integer,
	"checksum" varchar(128),
	"isStable" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "firmware_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "ota_deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" integer NOT NULL,
	"firmwareVersionId" integer NOT NULL,
	"previousVersion" varchar(50),
	"status" "ota_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"errorMessage" text,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" integer NOT NULL,
	"temperature" real,
	"humidity" real,
	"vibration" real,
	"power" real,
	"pressure" real,
	"rpm" real,
	"timestamp" bigint NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"password" text,
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
