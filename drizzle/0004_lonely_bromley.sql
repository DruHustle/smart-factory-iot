ALTER TABLE "assets" ADD COLUMN "manufacturerStreet" varchar(255);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "manufacturerZipcode" varchar(32);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "manufacturerCityTown" varchar(255);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "manufacturerNationalCode" varchar(2);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "ratedValue" varchar(80);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "ratedUnit" varchar(32);