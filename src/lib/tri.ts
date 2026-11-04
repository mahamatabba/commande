import { asc, desc, type AnyColumn, type SQL } from "drizzle-orm";

/**
 * Tri des listes paginées, porté par l'URL (`?tri=montantTotal&ordre=asc`).
 *
 * Le tri est fait par la base, pas dans le navigateur : trier côté client ne
 * réordonnerait que la page affichée (50 lignes), et la « plus grosse
 * facture » de la page 1 ne serait pas la plus grosse de toutes.
 *
 * Seules les colonnes déclarées sont acceptées : une valeur arbitraire de
 * l'URL ne devient jamais un nom de colonne SQL.
 */
export function lireTri<C extends string>(
  colonnes: Record<C, AnyColumn | SQL>,
  params: { tri?: string; ordre?: string },
  defaut: { colonne: NoInfer<C>; ordre: "asc" | "desc" },
  departage: AnyColumn,
) {
  const colonne = (params.tri && params.tri in colonnes ? params.tri : defaut.colonne) as C;
  const ordre = params.ordre === "asc" || params.ordre === "desc" ? params.ordre : defaut.ordre;
  const sens = ordre === "asc" ? asc : desc;
  return {
    colonne,
    ordre,
    // L'identifiant départage les égalités : sans lui, deux lignes de même
    // montant pourraient changer de page d'un affichage à l'autre.
    orderBy: [sens(colonnes[colonne]), sens(departage)],
  };
}
