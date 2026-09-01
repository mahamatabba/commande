const MOIS_ABREGES = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** Clé stable "AAAA-MM" pour indexer un mois, indépendante du fuseau horaire. */
export function cleMois(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Libellé court en français : "mars 2026". */
export function libelleMois(cle: string): string {
  const [annee, mois] = cle.split("-").map(Number);
  return `${MOIS_ABREGES[mois - 1]} ${annee}`;
}

/**
 * Construit les N derniers mois (le mois courant inclus) sous forme de clés
 * "AAAA-MM" triées chronologiquement, pour compléter les séries temporelles
 * avec des buckets à zéro quand la requête SQL n'a pas de ligne pour ce mois.
 */
export function derniersMois(n: number): string[] {
  const cles: string[] = [];
  const aujourdhui = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth() - i, 1));
    cles.push(cleMois(d));
  }
  return cles;
}

export function debutPeriode(n: number): Date {
  const aujourdhui = new Date();
  return new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth() - (n - 1), 1));
}
