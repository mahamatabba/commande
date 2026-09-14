/**
 * Libellés affichables des valeurs stockées en base.
 *
 * Les colonnes énumérées portent des codes techniques (`MOBILE_MONEY`,
 * `NON_PAYEE`). Aucun écran ne doit afficher ces codes bruts : ils sont
 * traduits ici, une seule fois, pour que tous les écrans disent la même
 * chose et qu'un ajout de valeur ne s'oublie pas dans un coin de l'interface.
 */

export const MOYEN_REGLEMENT_LABEL: Record<string, string> = {
  ESPECES: "Espèces",
  VIREMENT: "Virement",
  MOBILE_MONEY: "Mobile Money",
};

export const MODE_REGLEMENT_LABEL: Record<string, string> = {
  ESPECES: "Espèces",
  BON_DE_COMMANDE: "Bon de commande",
};

export const STATUT_FACTURE_LABEL: Record<string, string> = {
  NON_PAYEE: "Non payée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  SOLDEE: "Soldée",
  ANNULEE: "Annulée",
};

export const STATUT_PROFORMA_LABEL: Record<string, string> = {
  EMISE: "Émise",
  CONVERTIE: "Convertie en facture",
  ANNULEE: "Annulée",
};

export const STATUT_COMMANDE_CLIENT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

export const STATUT_COMMANDE_FOURNISSEUR_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export const SENS_REGLEMENT_LABEL: Record<string, string> = {
  ENCAISSEMENT: "Encaissement",
  DECAISSEMENT: "Décaissement",
};

/** Traduit une valeur, en retombant sur le code brut si elle est inconnue. */
export function libelle(table: Record<string, string>, valeur: string | null | undefined): string {
  if (!valeur) return "—";
  return table[valeur] ?? valeur;
}
