// Sans import serveur : lu par le menu, composant client.
/** Ce que chaque pastille compte, pour l'infobulle. */
export const SENS_COMPTEURS: Record<string, string> = {
  "/commandes-fournisseur": "bon(s) de commande en attente de réception",
  "/commandes-client": "vente(s) à facturer",
  "/proformas": "proforma(s) en cours",
  "/factures": "facture(s) impayée(s)",
};
