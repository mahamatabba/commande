-- Reprise des factures émises avant le passage aux montants hors taxe.
--
-- Ces factures ont été saisies quand le montant tapé était traité comme un
-- TTC : leurs lignes portent donc du toutes taxes, et leur « hors taxe » a été
-- obtenu à rebours en retranchant 18 %. Le document imprimé se contredisait —
-- « Montant HT 80 000 » sur la ligne, « Total HT 67 797 » juste en dessous.
--
-- On leur applique la règle en vigueur : les lignes SONT le hors taxe, la TVA
-- s'ajoute par-dessus au taux standard, le total est recomposé par addition.
-- Le total dû augmente donc de 19,5 %. Les règlements déjà encaissés et les
-- mouvements de caisse ne sont pas touchés : l'argent réellement reçu ne
-- change pas parce qu'on corrige une facture.
--
-- Ne concerne que les factures dont le hors taxe enregistré ne correspond pas
-- à la somme de leurs lignes. Les factures déjà conformes sont laissées
-- telles quelles, et rejouer cette migration ne change plus rien.
UPDATE "factures" f
SET "taux_tva" = CASE WHEN f."exonere_tva" THEN 0 ELSE 19.5 END,
    "montant_ht" = l."total",
    "montant_tva" = CASE WHEN f."exonere_tva" THEN 0 ELSE ROUND(l."total" * 19.5 / 100) END,
    "montant_total" = l."total"
      + CASE WHEN f."exonere_tva" THEN 0 ELSE ROUND(l."total" * 19.5 / 100) END
FROM (
  SELECT "commande_id", SUM("montant_ligne") AS "total"
  FROM "lignes_commande_client"
  GROUP BY "commande_id"
) l
WHERE f."commande_client_id" = l."commande_id"
  AND f."montant_ht" <> l."total";--> statement-breakpoint
-- Le total dû ayant changé, le statut ne correspond plus forcément à ce qui a
-- été encaissé : une facture soldée à l'ancien total ne l'est plus au nouveau,
-- et le reliquat correspond exactement à la TVA qui manquait. Les factures
-- annulées gardent leur statut, qui ne dépend pas du solde.
UPDATE "factures"
SET "statut" = CASE
      WHEN "montant_regle" >= "montant_total" THEN 'SOLDEE'::"public"."statut_facture"
      WHEN "montant_regle" > 0 THEN 'PARTIELLEMENT_PAYEE'::"public"."statut_facture"
      ELSE 'NON_PAYEE'::"public"."statut_facture"
    END
WHERE "statut" <> 'ANNULEE';
