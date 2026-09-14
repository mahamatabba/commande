import { z } from "zod";
import { TAUX_TVA_STANDARD } from "@/lib/constants";

/**
 * Bornes de saisie des dates. Sans elles, une faute de frappe (2206 au lieu
 * de 2026) passe en base sans bruit et fausse durablement les statistiques :
 * la ligne sort de toutes les périodes consultées et devient introuvable.
 *
 * Borne basse : 2000, antérieure à toute activité saisissable.
 * Borne haute : fin du jour courant — on ne facture pas dans le futur.
 */
const DATE_MIN = new Date("2000-01-01T00:00:00.000Z");

function finDeJournee(date: Date): Date {
  const copie = new Date(date);
  copie.setHours(23, 59, 59, 999);
  return copie;
}

const dateMetier = z.coerce
  .date({ message: "Date invalide" })
  .refine((d) => d >= DATE_MIN, "Date trop ancienne (avant 2000)")
  .refine(
    (d) => d <= finDeJournee(new Date()),
    "La date ne peut pas être dans le futur",
  );

const optionalTexte = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const optionalEmail = z
  .string()
  .email("Email invalide")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const fournisseurSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  adresse: optionalTexte,
  telephone: z.string().min(1, "Le téléphone est requis"),
  email: optionalEmail,
  nif: optionalTexte,
});
export type FournisseurInput = z.infer<typeof fournisseurSchema>;

export const clientSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: optionalTexte,
  raisonSociale: optionalTexte,
  telephone: z.string().min(1, "Le téléphone est requis"),
  email: optionalEmail,
  adresse: optionalTexte,
  nif: optionalTexte,
  // Case à cocher : absente du FormData quand elle n'est pas cochée.
  exonereTva: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const articleSchema = z.object({
  code: z.string().min(1, "Le code est requis"),
  designation: z.string().min(1, "La désignation est requise"),
  prixAchatIndicatif: z.coerce.number().int().min(0),
  prixVente: z.coerce.number().int().min(0),
  tauxTva: z.coerce.number().min(0).max(100).default(TAUX_TVA_STANDARD),
});
export type ArticleInput = z.infer<typeof articleSchema>;

// Quantité : bornée par le haut pour qu'une saisie accidentelle (un code-barre
// collé dans le champ) échoue ici plutôt qu'en dépassement numeric(10,2).
export const ligneSchema = z.object({
  articleId: z.number().int().positive().nullable(),
  designation: z.string().min(1, "La désignation est requise"),
  quantite: z
    .number({ message: "La quantité doit être un nombre" })
    .positive("La quantité doit être supérieure à 0")
    .max(100_000, "Quantité trop élevée"),
  prixUnitaire: z
    .number({ message: "Le prix doit être un nombre" })
    .min(0, "Le prix ne peut pas être négatif")
    .max(1_000_000_000, "Prix trop élevé"),
});
export type LigneInput = z.infer<typeof ligneSchema>;

export const commandeFournisseurSchema = z.object({
  fournisseurId: z.coerce.number().int().positive("Le fournisseur est requis"),
  dateCommande: dateMetier,
  lignes: z.array(ligneSchema).min(1, "Au moins une ligne est requise"),
});
export type CommandeFournisseurInput = z.infer<typeof commandeFournisseurSchema>;

export const commandeClientSchema = z.object({
  clientId: z.coerce.number().int().positive("Le client est requis"),
  dateCommande: dateMetier,
  modeReglement: z.enum(["ESPECES", "BON_DE_COMMANDE"]),
  lignes: z.array(ligneSchema).min(1, "Au moins une ligne est requise"),
});
export type CommandeClientInput = z.infer<typeof commandeClientSchema>;

/**
 * Régime de TVA choisi au moment d'émettre la facture. Le choix est explicite
 * — jamais déduit silencieusement — parce qu'il change le montant réclamé au
 * client. La fiche client ne fait que proposer la valeur par défaut.
 */
export const emissionFactureSchema = z.object({
  commandeClientId: z.coerce.number().int().positive("La commande client est requise"),
  regimeTva: z.enum(["ASSUJETTI", "EXONERE"], {
    message: "Précisez si la facture est soumise à la TVA",
  }),
});
export type EmissionFactureInput = z.infer<typeof emissionFactureSchema>;

/**
 * Établissement d'une facture proforma. Même choix de régime de TVA que pour
 * une facture — c'est le montant annoncé au client qui en dépend — plus une
 * durée de validité, car une offre chiffrée ne peut pas rester opposable
 * indéfiniment.
 */
export const emissionProformaSchema = z.object({
  commandeClientId: z.coerce.number().int().positive("La commande client est requise"),
  regimeTva: z.enum(["ASSUJETTI", "EXONERE"], {
    message: "Précisez si la proforma est soumise à la TVA",
  }),
  validiteJours: z.coerce
    .number({ message: "La durée de validité doit être un nombre de jours" })
    .int("La durée de validité doit être un nombre entier de jours")
    .min(1, "La proforma doit être valable au moins un jour")
    .max(365, "La durée de validité ne peut pas dépasser un an"),
});
export type EmissionProformaInput = z.infer<typeof emissionProformaSchema>;

/**
 * Passage d'une facture au statut « payée » depuis l'écran facture. Ce n'est
 * pas un simple changement de statut : un encaissement réel du reste à payer
 * est enregistré, il entre en caisse et doit donc porter son moyen et sa date.
 */
export const marquagePaiementSchema = z.object({
  dateReglement: dateMetier,
  moyen: z.enum(["ESPECES", "VIREMENT", "MOBILE_MONEY"]),
  commentaire: optionalTexte,
});
export type MarquagePaiementInput = z.infer<typeof marquagePaiementSchema>;

export const reglementSchema = z.object({
  cible: z.enum(["facture", "commande_fournisseur"]),
  cibleId: z.coerce.number().int().positive(),
  montant: z.coerce.number().int().positive("Le montant doit être positif"),
  dateReglement: dateMetier,
  moyen: z.enum(["ESPECES", "VIREMENT", "MOBILE_MONEY"]),
  commentaire: optionalTexte,
});
export type ReglementInput = z.infer<typeof reglementSchema>;

export const annulationSchema = z.object({
  motif: z.string().min(3, "Le motif est requis (3 caractères minimum)"),
});
export type AnnulationInput = z.infer<typeof annulationSchema>;

export const correctionCommandeClientSchema = z.object({
  modeReglement: z.enum(["ESPECES", "BON_DE_COMMANDE"]),
});
export type CorrectionCommandeClientInput = z.infer<typeof correctionCommandeClientSchema>;

export const utilisateurCreationSchema = z.object({
  email: z.string().email("Email invalide"),
  nomComplet: z.string().min(1, "Le nom est requis"),
  role: z.enum(["AGENT", "SUPERVISEUR", "ADMIN"]),
  motDePasse: z.string().min(8, "8 caractères minimum"),
});
export type UtilisateurCreationInput = z.infer<typeof utilisateurCreationSchema>;

export const utilisateurModificationSchema = z.object({
  nomComplet: z.string().min(1, "Le nom est requis"),
  role: z.enum(["AGENT", "SUPERVISEUR", "ADMIN"]),
  actif: z.coerce.boolean(),
});
export type UtilisateurModificationInput = z.infer<typeof utilisateurModificationSchema>;
