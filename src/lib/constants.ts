/**
 * Coordonnées officielles de l'entreprise pour l'en-tête et le pied de page
 * des documents imprimés (factures, bons de commande) — reprises de
 * l'en-tête à lettre officielle.
 */
export const AEI_INFO = {
  nom: "ABDELDJELIL ETUDE INFORMATIQUE",
  tagline: "Partenaire agréé par HP (2BKEI)",
  adresse: "Avenue Charles de Gaulle - B.P. 305 N'Djaména - Tchad",
  telephones: ["+235 66 48 57 00", "66 27 11 69", "99 90 04 42"],
  emails: ["aabdoulaye@abdeldjelilinfo.com", "zabdramane@abdeldjelilinfo.com"],
  nif: "9011065V",
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
