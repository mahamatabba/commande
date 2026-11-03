ALTER TABLE "proformas" ADD COLUMN "delai_livraison" varchar(255);--> statement-breakpoint
ALTER TABLE "proformas" ADD COLUMN "garantie" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "supprime" boolean DEFAULT false NOT NULL;