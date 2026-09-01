import { sql } from "drizzle-orm";
import type { Transaction } from "@/db";
import { compteursNumerotation } from "@/db/schema";

export type PrefixeNumero = "CF" | "CC" | "FAC";

/**
 * Génère le numéro suivant pour un préfixe donné (ex : "FAC-2026-0001"),
 * de façon atomique et continue (règle métier n°6 : jamais côté client,
 * jamais réutilisable). Doit être appelé à l'intérieur d'une transaction
 * `db.transaction(async (tx) => ...)`, dans la même transaction que
 * l'insertion de l'enregistrement numéroté.
 *
 * Le upsert `ON CONFLICT ... DO UPDATE` prend un verrou de ligne le temps de
 * la transaction : deux transactions concurrentes sur la même clé
 * (préfixe + année) sont sérialisées par Postgres, garantissant l'absence
 * de doublon ou de trou.
 */
export async function genererNumero(
  tx: Transaction,
  prefixe: PrefixeNumero,
): Promise<string> {
  const annee = new Date().getFullYear();
  const cle = `${prefixe}-${annee}`;

  const [ligne] = await tx
    .insert(compteursNumerotation)
    .values({ cle, dernierNumero: 1 })
    .onConflictDoUpdate({
      target: compteursNumerotation.cle,
      set: { dernierNumero: sql`${compteursNumerotation.dernierNumero} + 1` },
    })
    .returning({ dernierNumero: compteursNumerotation.dernierNumero });

  const sequence = String(ligne.dernierNumero).padStart(4, "0");
  return `${cle}-${sequence}`;
}
