CREATE TYPE "public"."statut_proforma" AS ENUM('EMISE', 'CONVERTIE', 'ANNULEE');--> statement-breakpoint
CREATE TABLE "proformas" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" varchar(30) NOT NULL,
	"commande_client_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"date_proforma" timestamp with time zone NOT NULL,
	"date_validite" timestamp with time zone NOT NULL,
	"montant_ht" numeric(14, 2) DEFAULT 0 NOT NULL,
	"exonere_tva" boolean DEFAULT false NOT NULL,
	"taux_tva" numeric(5, 2) DEFAULT 0 NOT NULL,
	"montant_tva" numeric(14, 2) DEFAULT 0 NOT NULL,
	"montant_total" numeric(14, 2) NOT NULL,
	"statut" "statut_proforma" DEFAULT 'EMISE' NOT NULL,
	"facture_id" integer,
	"nif_client" varchar(100),
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proformas_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_commande_client_id_commandes_client_id_fk" FOREIGN KEY ("commande_client_id") REFERENCES "public"."commandes_client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_facture_id_factures_id_fk" FOREIGN KEY ("facture_id") REFERENCES "public"."factures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_proformas_commande_en_cours" ON "proformas" USING btree ("commande_client_id") WHERE statut = 'EMISE';--> statement-breakpoint
CREATE INDEX "idx_proformas_client" ON "proformas" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_proformas_commande" ON "proformas" USING btree ("commande_client_id");--> statement-breakpoint
CREATE INDEX "idx_proformas_date" ON "proformas" USING btree ("date_proforma");--> statement-breakpoint
CREATE INDEX "idx_proformas_statut" ON "proformas" USING btree ("statut");