/**
 * Coordonnées de l'entreprise pour l'en-tête des factures imprimées.
 * Valeurs à remplacer par les informations réelles d'AEI avant mise en
 * production (voir README).
 */
export const AEI_INFO = {
  nom: "Abdeldjalil Étude Informatique (AEI)",
  adresse: "N'Djamena, Tchad",
  telephone: "+235 00 00 00 00",
  email: "contact@aei.td",
  nif: "NIF-AEI-000000",
};

/**
 * Taux de TVA standard appliqué aux factures. Les lignes de commande client
 * ne conservent pas de taux individuel (seuls les articles référencés en
 * ont un) : ce taux global sert à décomposer le montant total (TTC) en
 * HT + TVA sur le document imprimé.
 */
export const TAUX_TVA_STANDARD = 18;

/**
 * Palette catégorielle de référence (voir skill dataviz) : 8 teintes, ordre
 * fixe, validées CVD/contraste. Ne jamais réordonner ni ajouter une teinte
 * générée : au-delà du slot utilisé, replier dans "Autre" plutôt qu'étendre.
 */
export const CHART_COLORS = {
  bleu: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  jaune: "#eda100",
  magenta: "#e87ba4",
  vert: "#008300",
  violet: "#4a3aa7",
  rouge: "#e34948",
} as const;
