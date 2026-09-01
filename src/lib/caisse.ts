import { sql } from "drizzle-orm";
import type { Transaction } from "@/db";
import { db } from "@/db";
import { mouvementsCaisse } from "@/db/schema";

/**
 * Solde de caisse = somme(encaissements) - somme(décaissements), recalculé à
 * chaque appel (règle métier n°6 : jamais stocké comme valeur unique
 * mutable). `mouvementsCaisse.soldeApres` n'est qu'un instantané d'audit par
 * mouvement, pas la source de vérité.
 */
export async function calculerSoldeCaisse(executor: Transaction | typeof db): Promise<number> {
  const [row] = await executor
    .select({
      solde: sql<string>`COALESCE(SUM(CASE WHEN ${mouvementsCaisse.sens} = 'ENCAISSEMENT' THEN ${mouvementsCaisse.montant} ELSE -${mouvementsCaisse.montant} END), 0)`,
    })
    .from(mouvementsCaisse);
  return Number(row?.solde ?? 0);
}

/**
 * Enregistre un mouvement de caisse et renvoie le nouveau solde. Doit être
 * appelée à l'intérieur d'une transaction : verrouille la table des
 * mouvements le temps de la transaction pour sérialiser les écritures
 * concurrentes et garantir que `soldeApres` reste exact même si deux
 * règlements sont saisis en même temps.
 */
export async function enregistrerMouvementCaisse(
  tx: Transaction,
  params: { reglementId: number; sens: "ENCAISSEMENT" | "DECAISSEMENT"; montant: number },
): Promise<number> {
  await tx.execute(sql`LOCK TABLE mouvements_caisse IN SHARE ROW EXCLUSIVE MODE`);
  const soldeAvant = await calculerSoldeCaisse(tx);
  const soldeApres = params.sens === "ENCAISSEMENT" ? soldeAvant + params.montant : soldeAvant - params.montant;

  await tx.insert(mouvementsCaisse).values({
    reglementId: params.reglementId,
    sens: params.sens,
    montant: params.montant,
    soldeApres,
  });

  return soldeApres;
}
