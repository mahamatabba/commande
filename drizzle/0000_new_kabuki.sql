CREATE TYPE "public"."mode_reglement" AS ENUM('ESPECES', 'BON_DE_COMMANDE');--> statement-breakpoint
CREATE TYPE "public"."moyen_reglement" AS ENUM('ESPECES', 'VIREMENT', 'MOBILE_MONEY');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('AGENT', 'SUPERVISEUR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."sens_reglement" AS ENUM('ENCAISSEMENT', 'DECAISSEMENT');--> statement-breakpoint
CREATE TYPE "public"."statut_commande_client" AS ENUM('BROUILLON', 'VALIDEE', 'FACTUREE', 'ANNULEE');--> statement-breakpoint
CREATE TYPE "public"."statut_commande_fournisseur" AS ENUM('BROUILLON', 'VALIDEE', 'RECUE', 'ANNULEE');--> statement-breakpoint
CREATE TYPE "public"."statut_facture" AS ENUM('NON_PAYEE', 'PARTIELLEMENT_PAYEE', 'SOLDEE', 'ANNULEE');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"designation" varchar(255) NOT NULL,
	"prix_achat_indicatif" numeric(14, 2) NOT NULL,
	"prix_vente" numeric(14, 2) NOT NULL,
	"taux_tva" numeric(5, 2) DEFAULT 18 NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "articles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(255) NOT NULL,
	"prenom" varchar(255),
	"raison_sociale" varchar(255),
	"telephone" varchar(50) NOT NULL,
	"email" varchar(255),
	"adresse" text,
	"nif" varchar(100),
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commandes_client" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" varchar(30) NOT NULL,
	"client_id" integer NOT NULL,
	"date_commande" timestamp with time zone NOT NULL,
	"mode_reglement" "mode_reglement" NOT NULL,
	"statut" "statut_commande_client" DEFAULT 'BROUILLON' NOT NULL,
	"montant_total" numeric(14, 2) DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commandes_client_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "commandes_fournisseur" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" varchar(30) NOT NULL,
	"fournisseur_id" integer NOT NULL,
	"date_commande" timestamp with time zone NOT NULL,
	"statut" "statut_commande_fournisseur" DEFAULT 'BROUILLON' NOT NULL,
	"montant_total" numeric(14, 2) DEFAULT 0 NOT NULL,
	"montant_regle" numeric(14, 2) DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commandes_fournisseur_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "compteurs_numerotation" (
	"cle" varchar(20) PRIMARY KEY NOT NULL,
	"dernier_numero" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factures" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" varchar(30) NOT NULL,
	"commande_client_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"date_facture" timestamp with time zone NOT NULL,
	"montant_total" numeric(14, 2) NOT NULL,
	"montant_regle" numeric(14, 2) DEFAULT 0 NOT NULL,
	"reste_a_payer" numeric(14, 2) GENERATED ALWAYS AS ((montant_total - montant_regle)) STORED,
	"statut" "statut_facture" DEFAULT 'NON_PAYEE' NOT NULL,
	"nif_client" varchar(100),
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factures_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "fournisseurs" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(255) NOT NULL,
	"adresse" text,
	"telephone" varchar(50) NOT NULL,
	"email" varchar(255),
	"nif" varchar(100),
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_activite" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entite" varchar(100) NOT NULL,
	"entite_id" integer,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lignes_commande_client" (
	"id" serial PRIMARY KEY NOT NULL,
	"commande_id" integer NOT NULL,
	"article_id" integer,
	"designation" varchar(255) NOT NULL,
	"quantite" numeric(10, 2) NOT NULL,
	"prix_unitaire" numeric(14, 2) NOT NULL,
	"montant_ligne" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lignes_commande_fournisseur" (
	"id" serial PRIMARY KEY NOT NULL,
	"commande_id" integer NOT NULL,
	"article_id" integer,
	"designation" varchar(255) NOT NULL,
	"quantite" numeric(10, 2) NOT NULL,
	"prix_unitaire" numeric(14, 2) NOT NULL,
	"montant_ligne" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mouvements_caisse" (
	"id" serial PRIMARY KEY NOT NULL,
	"reglement_id" integer NOT NULL,
	"sens" "sens_reglement" NOT NULL,
	"montant" numeric(14, 2) NOT NULL,
	"date_mouvement" timestamp with time zone DEFAULT now() NOT NULL,
	"solde_apres" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reglements" (
	"id" serial PRIMARY KEY NOT NULL,
	"sens" "sens_reglement" NOT NULL,
	"montant" numeric(14, 2) NOT NULL,
	"date_reglement" timestamp with time zone NOT NULL,
	"facture_id" integer,
	"commande_fournisseur_id" integer,
	"moyen" "moyen_reglement" NOT NULL,
	"commentaire" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reglements_exactement_une_reference" CHECK ((
        ("reglements"."facture_id" IS NOT NULL AND "reglements"."commande_fournisseur_id" IS NULL)
        OR
        ("reglements"."facture_id" IS NULL AND "reglements"."commande_fournisseur_id" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"nom_complet" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'AGENT' NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "commandes_client" ADD CONSTRAINT "commandes_client_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes_client" ADD CONSTRAINT "commandes_client_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes_fournisseur" ADD CONSTRAINT "commandes_fournisseur_fournisseur_id_fournisseurs_id_fk" FOREIGN KEY ("fournisseur_id") REFERENCES "public"."fournisseurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commandes_fournisseur" ADD CONSTRAINT "commandes_fournisseur_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_commande_client_id_commandes_client_id_fk" FOREIGN KEY ("commande_client_id") REFERENCES "public"."commandes_client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_activite" ADD CONSTRAINT "journal_activite_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_commande_client" ADD CONSTRAINT "lignes_commande_client_commande_id_commandes_client_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_commande_client" ADD CONSTRAINT "lignes_commande_client_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_commande_fournisseur" ADD CONSTRAINT "lignes_commande_fournisseur_commande_id_commandes_fournisseur_id_fk" FOREIGN KEY ("commande_id") REFERENCES "public"."commandes_fournisseur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lignes_commande_fournisseur" ADD CONSTRAINT "lignes_commande_fournisseur_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvements_caisse" ADD CONSTRAINT "mouvements_caisse_reglement_id_reglements_id_fk" FOREIGN KEY ("reglement_id") REFERENCES "public"."reglements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglements" ADD CONSTRAINT "reglements_facture_id_factures_id_fk" FOREIGN KEY ("facture_id") REFERENCES "public"."factures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglements" ADD CONSTRAINT "reglements_commande_fournisseur_id_commandes_fournisseur_id_fk" FOREIGN KEY ("commande_fournisseur_id") REFERENCES "public"."commandes_fournisseur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglements" ADD CONSTRAINT "reglements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;