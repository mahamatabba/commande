import Link from "next/link";
import type { ParamsListe } from "@/lib/filtres";

/**
 * Onglets de statut au-dessus d'une liste : « Tous (24) · Non payées (4) ·
 * Soldées (19) … ». Chaque onglet est un lien qui conserve la période
 * choisie et revient en première page.
 *
 * Les compteurs portent sur la période filtrée, tous statuts confondus : ils
 * disent combien de lignes l'onglet affichera.
 */
export function OngletsStatut({
  base,
  params,
  statuts,
  compteurs,
  actif,
}: {
  base: string;
  params: ParamsListe;
  statuts: { valeur: string; libelle: string }[];
  compteurs: Record<string, number>;
  actif: string | undefined;
}) {
  function lien(statut: string | undefined): string {
    const recherche = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(params)) {
      if (cle === "page" || cle === "statut" || valeur === undefined) continue;
      for (const v of Array.isArray(valeur) ? valeur : [valeur]) if (v !== "") recherche.append(cle, v);
    }
    if (statut) recherche.set("statut", statut);
    const qs = recherche.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const total = Object.values(compteurs).reduce((s, n) => s + n, 0);
  const onglets = [{ valeur: undefined, libelle: "Tous", n: total }, ...statuts.map((s) => ({ ...s, n: compteurs[s.valeur] ?? 0 }))];

  return (
    <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
      {onglets.map((o) => {
        const estActif = (o.valeur ?? undefined) === (actif ?? undefined);
        return (
          <Link
            key={o.valeur ?? "tous"}
            href={lien(o.valeur)}
            aria-current={estActif ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              estActif
                ? "border-[var(--mantine-color-brand-6)] bg-[var(--mantine-color-brand-7)] text-white"
                : "border-[var(--mantine-color-dark-4)] bg-[var(--mantine-color-dark-7)] text-[var(--mantine-color-dark-0)] hover:border-[var(--mantine-color-dark-2)]"
            }`}
          >
            {o.libelle}
            <span
              className={`min-w-6 rounded-full px-1.5 text-center text-xs tabular-nums ${
                estActif ? "bg-white/20" : "bg-[var(--mantine-color-dark-5)] text-[var(--mantine-color-dark-1)]"
              }`}
            >
              {o.n}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
