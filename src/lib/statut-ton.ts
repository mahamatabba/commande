/**
 * Le « ton » d'un statut : ce qu'il signifie pour l'œil, indépendamment du
 * support qui l'affiche.
 *
 * Les statuts sont rendus à deux endroits qui n'ont aucun vocabulaire commun :
 * l'écran, en classes Tailwind, et le PDF, en couleurs hexadécimales posées
 * une par une. Tant que chacun tenait sa propre table, un statut ajouté à l'un
 * ne l'était pas à l'autre — et « Reçue » pouvait sortir verte à l'écran et
 * grise sur le bon de commande envoyé au fournisseur.
 *
 * Cette table dit uniquement ce que vaut un statut. `statut-style.ts` la
 * traduit en classes, `lib/pdf/gabarit.tsx` en couleurs.
 */
export type TonStatut = "neutre" | "annulee" | "enCours" | "bon" | "attention" | "urgent";

export const TON_COMMANDE_FOURNISSEUR: Record<string, TonStatut> = {
  BROUILLON: "neutre",
  VALIDEE: "enCours",
  RECUE: "bon",
  ANNULEE: "annulee",
};

export const TON_COMMANDE_CLIENT: Record<string, TonStatut> = {
  BROUILLON: "neutre",
  VALIDEE: "enCours",
  FACTUREE: "bon",
  ANNULEE: "annulee",
};

export const TON_PROFORMA: Record<string, TonStatut> = {
  EMISE: "enCours",
  CONVERTIE: "bon",
  ANNULEE: "annulee",
};

export const TON_FACTURE: Record<string, TonStatut> = {
  NON_PAYEE: "urgent",
  PARTIELLEMENT_PAYEE: "attention",
  SOLDEE: "bon",
  ANNULEE: "annulee",
};

/** Ton d'un statut inconnu : neutre plutôt qu'absent. */
export function tonDe(table: Record<string, TonStatut>, statut: string): TonStatut {
  return table[statut] ?? "neutre";
}
