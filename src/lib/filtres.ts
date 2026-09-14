/**
 * Lecture des filtres passés dans l'URL.
 *
 * Deux règles :
 *
 * 1. Une valeur illisible est IGNORÉE, jamais transmise à la base. Un favori
 *    périmé, un lien tronqué ou une adresse recopiée à la main ne doivent pas
 *    produire une erreur PostgreSQL — le filtre est simplement écarté et
 *    l'écran s'affiche.
 *
 * 2. La borne « Au » couvre la journée entière. `new Date("2026-09-13")` vaut
 *    minuit : comparé tel quel, il exclut tous les documents du jour même.
 *    C'est la cause du « aucune facture » sur une recherche du jour.
 */

const FORMAT_DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Début du jour demandé, ou undefined si la valeur n'est pas une date. */
export function bornerDebut(valeur: string | undefined): Date | undefined {
  const date = lireDate(valeur);
  if (!date) return undefined;
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Fin du jour demandé (23:59:59.999), pour que « Au » inclue la journée. */
export function bornerFin(valeur: string | undefined): Date | undefined {
  const date = lireDate(valeur);
  if (!date) return undefined;
  date.setHours(23, 59, 59, 999);
  return date;
}

function lireDate(valeur: string | undefined): Date | undefined {
  if (!valeur || !FORMAT_DATE_ISO.test(valeur)) return undefined;
  // Découpage explicite : `new Date("2026-09-13")` serait interprété en UTC et
  // décalerait la borne d'un jour selon le fuseau du serveur.
  const [annee, mois, jour] = valeur.split("-").map(Number);
  const date = new Date(annee, mois - 1, jour);
  // `new Date(2026, 12, 45)` ne renvoie pas une erreur : il déborde sur un
  // autre mois. On vérifie donc que la date construite correspond bien à ce
  // qui était demandé, sinon le filtre porterait sur une période inattendue.
  const correspond =
    date.getFullYear() === annee && date.getMonth() === mois - 1 && date.getDate() === jour;
  return correspond ? date : undefined;
}

/**
 * Ne retient la valeur que si elle fait partie des statuts connus. Évite
 * d'envoyer un texte arbitraire à une comparaison sur un type énuméré
 * PostgreSQL, qui échouerait avec une erreur non rattrapée.
 */
export function lireStatut<T extends string>(
  valeur: string | undefined,
  statutsAutorises: readonly T[],
): T | undefined {
  if (!valeur) return undefined;
  return (statutsAutorises as readonly string[]).includes(valeur)
    ? (valeur as T)
    : undefined;
}

export const STATUTS_FACTURE = [
  "NON_PAYEE",
  "PARTIELLEMENT_PAYEE",
  "SOLDEE",
  "ANNULEE",
] as const;

export const STATUTS_PROFORMA = ["EMISE", "CONVERTIE", "ANNULEE"] as const;

export const STATUTS_COMMANDE_CLIENT = [
  "BROUILLON",
  "VALIDEE",
  "FACTUREE",
  "ANNULEE",
] as const;

export const STATUTS_COMMANDE_FOURNISSEUR = [
  "BROUILLON",
  "VALIDEE",
  "RECUE",
  "ANNULEE",
] as const;

/** Pagination d'une liste : page ≥ 1, taille bornée. */
export function lirePage(valeur: string | undefined): number {
  const page = Number(valeur);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
