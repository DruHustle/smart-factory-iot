CREATE TABLE "asset_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assetId" integer NOT NULL,
	"version" integer NOT NULL,
	"changeType" varchar(32) NOT NULL,
	"changeNote" text,
	"changedBy" integer NOT NULL,
	"snapshot" json NOT NULL,
	"sha256" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "aasVersion" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_versions_asset_version_unique" ON "asset_versions" USING btree ("assetId","version");
--> statement-breakpoint
-- Preserve the current state as a migration baseline. Earlier edit history did
-- not exist, so these initial rows intentionally have no integrity hash.
INSERT INTO "asset_versions" ("assetId", "version", "changeType", "changeNote", "changedBy", "snapshot", "sha256")
SELECT
  a."id",
  a."aasVersion",
  'baseline',
  'Version history initialized during migration; earlier revisions are unavailable.',
  0,
  json_build_object(
    'asset', json_build_object(
      'assetId', a."assetId", 'name', a."name", 'assetType', a."assetType",
      'manufacturer', a."manufacturer", 'model', a."model",
      'manufacturerStreet', a."manufacturerStreet", 'manufacturerZipcode', a."manufacturerZipcode",
      'manufacturerCityTown', a."manufacturerCityTown", 'manufacturerNationalCode', a."manufacturerNationalCode",
      'manufacturerArticleNumber', a."manufacturerArticleNumber", 'orderCodeOfManufacturer', a."orderCodeOfManufacturer",
      'ratedValue', a."ratedValue", 'ratedUnit', a."ratedUnit", 'serialNumber', a."serialNumber",
      'location', a."location", 'zone', a."zone", 'aasxImported', a."aasxImported", 'aasxPackageId', a."aasxPackageId"
    ),
    'shell', a."aasShell",
    'submodels', a."aasSubmodels",
    'conceptDescriptions', a."aasConceptDescriptions"
  ),
  NULL
FROM "assets" a;
