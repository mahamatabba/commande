import type { Session } from "next-auth";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { commandesClient, commandesFournisseur, factures, proformas } from "@/db/schema";
import { can } from "@/lib/permissions";

/**
 * Pastilles du menu : le nombre d'éléments qui attendent une action, par
 * lien (`href` → nombre). Seuls les compteurs que la session a le droit de
 * voir sont calculés.
 *
 * Quatre `count(*)` sur des colonnes indexées : négligeable. Une panne de
 * base ne doit pas empêcher d'afficher le menu, d'où le repli sur « aucune
 * pastille ».
 */
export async function compterElementsEnAttente(session: Session | null): Promise<Record<string, number>> {
  const n = sql<number>`count(*)::int`;
  const zero = Promise.resolve([{ n: 0 }]);
  try {
    const [achats, ventes, proformasEnCours, impayees] = await Promise.all([
      can(session, "commandes_fournisseur:read")
        ? db.select({ n }).from(commandesFournisseur).where(eq(commandesFournisseur.statut, "VALIDEE"))
        : zero,
      can(session, "commandes_client:read")
        ? db.select({ n }).from(commandesClient).where(eq(commandesClient.statut, "VALIDEE"))
        : zero,
      can(session, "factures:read") ? db.select({ n }).from(proformas).where(eq(proformas.statut, "EMISE")) : zero,
      can(session, "impayes:read")
        ? db.select({ n }).from(factures).where(inArray(factures.statut, ["NON_PAYEE", "PARTIELLEMENT_PAYEE"]))
        : zero,
    ]);
    return {
      "/commandes-fournisseur": achats[0]?.n ?? 0,
      "/commandes-client": ventes[0]?.n ?? 0,
      "/proformas": proformasEnCours[0]?.n ?? 0,
      "/factures": impayees[0]?.n ?? 0,
    };
  } catch {
    return {};
  }
}
