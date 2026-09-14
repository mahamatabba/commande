ALTER TABLE "articles" ALTER COLUMN "taux_tva" SET DEFAULT 19.5;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "exonere_tva" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "factures" ADD COLUMN "montant_ht" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "factures" ADD COLUMN "exonere_tva" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "factures" ADD COLUMN "taux_tva" numeric(5, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "factures" ADD COLUMN "montant_tva" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lignes_commande_client" ADD COLUMN "prix_achat_unitaire" numeric(14, 2);--> statement-breakpoint
CREATE INDEX "idx_cc_client" ON "commandes_client" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cc_date" ON "commandes_client" USING btree ("date_commande");--> statement-breakpoint
CREATE INDEX "idx_cc_statut" ON "commandes_client" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_cf_fournisseur" ON "commandes_fournisseur" USING btree ("fournisseur_id");--> statement-breakpoint
CREATE INDEX "idx_cf_date" ON "commandes_fournisseur" USING btree ("date_commande");--> statement-breakpoint
CREATE INDEX "idx_cf_statut" ON "commandes_fournisseur" USING btree ("statut");--> statement-breakpoint
-- Reprise des factures déjà émises.
--
-- Jusqu'ici le montant enregistré était considéré comme TTC et le HT était
-- recalculé à l'affichage avec un taux de 18 %. On réécrit ce même calcul dans
-- les colonnes, une fois pour toutes : une facture déjà remise au client est
-- ainsi réimprimée à l'identique. Le total (et donc le reste à payer et les
-- règlements) n'est PAS modifié.
UPDATE "factures"
SET "taux_tva" = 18.00,
    "exonere_tva" = false,
    "montant_ht" = ROUND("montant_total" / 1.18, 2),
    "montant_tva" = "montant_total" - ROUND("montant_total" / 1.18, 2)
WHERE "montant_ht" = 0;--> statement-breakpoint
-- Prix d'achat figé sur les lignes de vente déjà saisies : on prend le tarif
-- catalogue actuel, seule valeur disponible rétroactivement.
UPDATE "lignes_commande_client" AS l
SET "prix_achat_unitaire" = a."prix_achat_indicatif"
FROM "articles" AS a
WHERE l."article_id" = a."id" AND l."prix_achat_unitaire" IS NULL;--> statement-breakpoint
-- Remise à zéro du « montant réglé » des factures annulées dont les
-- encaissements ont bien été repris (solde net nul). Ces factures affichaient
-- « annulée » et « intégralement réglée » en même temps. Les factures annulées
-- qui garderaient un solde net non nul ne sont PAS touchées : il faut alors
-- comprendre pourquoi avant de corriger.
UPDATE "factures" f
SET "montant_regle" = 0
WHERE f."statut" = 'ANNULEE'
  AND f."montant_regle" <> 0
  AND COALESCE((
    SELECT SUM(CASE WHEN r."sens" = 'ENCAISSEMENT' THEN r."montant" ELSE -r."montant" END)
    FROM "reglements" r
    WHERE r."facture_id" = f."id"
  ), 0) = 0;--> statement-breakpoint
-- ATTENTION : cet index échoue si la base contient déjà deux factures pour une
-- même vente. À vérifier AVANT d'appliquer la migration :
--   SELECT commande_client_id, count(*) FROM factures
--   GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX "uq_factures_commande_client" ON "factures" USING btree ("commande_client_id");--> statement-breakpoint
CREATE INDEX "idx_factures_client" ON "factures" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_factures_date" ON "factures" USING btree ("date_facture");--> statement-breakpoint
CREATE INDEX "idx_factures_statut" ON "factures" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "idx_journal_user" ON "journal_activite" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_journal_date" ON "journal_activite" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_lcc_commande" ON "lignes_commande_client" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "idx_lcc_article" ON "lignes_commande_client" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_lcf_commande" ON "lignes_commande_fournisseur" USING btree ("commande_id");--> statement-breakpoint
CREATE INDEX "idx_lcf_article" ON "lignes_commande_fournisseur" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_mc_reglement" ON "mouvements_caisse" USING btree ("reglement_id");--> statement-breakpoint
CREATE INDEX "idx_mc_date" ON "mouvements_caisse" USING btree ("date_mouvement");--> statement-breakpoint
CREATE INDEX "idx_reglements_facture" ON "reglements" USING btree ("facture_id");--> statement-breakpoint
CREATE INDEX "idx_reglements_commande_fournisseur" ON "reglements" USING btree ("commande_fournisseur_id");--> statement-breakpoint
CREATE INDEX "idx_reglements_date" ON "reglements" USING btree ("date_reglement");