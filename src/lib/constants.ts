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
  emails: ["aabdoulaye@abdeldjelilinfo.com", "contact@abdeldjelilinfo.com"],
  nif: "9011065V",
};

/**
 * Taux de TVA en vigueur au Tchad. Les montants saisis sur les commandes sont
 * des montants HORS TAXE : la TVA s'ajoute par-dessus à l'émission de la
 * facture, elle n'est jamais déduite d'un total réputé TTC.
 *
 * Ce taux n'est qu'une valeur par défaut. Le taux réellement appliqué est
 * figé sur la facture (`factures.tauxTva`) au moment de l'émission, pour que
 * les factures déjà émises ne bougent plus si le taux légal change.
 */
export const TAUX_TVA_STANDARD = 19.5;

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
