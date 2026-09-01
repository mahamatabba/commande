import { z } from "zod";

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
});
export type ClientInput = z.infer<typeof clientSchema>;

export const articleSchema = z.object({
  code: z.string().min(1, "Le code est requis"),
  designation: z.string().min(1, "La désignation est requise"),
  prixAchatIndicatif: z.coerce.number().int().min(0),
  prixVente: z.coerce.number().int().min(0),
  tauxTva: z.coerce.number().min(0).max(100).default(18),
});
export type ArticleInput = z.infer<typeof articleSchema>;

export const ligneSchema = z.object({
  articleId: z.number().int().positive().nullable(),
  designation: z.string().min(1, "La désignation est requise"),
  quantite: z.number().positive("La quantité doit être positive"),
  prixUnitaire: z.number().min(0, "Le prix ne peut pas être négatif"),
});
export type LigneInput = z.infer<typeof ligneSchema>;

export const commandeFournisseurSchema = z.object({
  fournisseurId: z.coerce.number().int().positive("Le fournisseur est requis"),
  dateCommande: z.coerce.date(),
  lignes: z.array(ligneSchema).min(1, "Au moins une ligne est requise"),
});
export type CommandeFournisseurInput = z.infer<typeof commandeFournisseurSchema>;

export const commandeClientSchema = z.object({
  clientId: z.coerce.number().int().positive("Le client est requis"),
  dateCommande: z.coerce.date(),
  modeReglement: z.enum(["ESPECES", "BON_DE_COMMANDE"]),
  lignes: z.array(ligneSchema).min(1, "Au moins une ligne est requise"),
});
export type CommandeClientInput = z.infer<typeof commandeClientSchema>;

export const emissionFactureSchema = z.object({
  commandeClientId: z.coerce.number().int().positive("La commande client est requise"),
});
export type EmissionFactureInput = z.infer<typeof emissionFactureSchema>;

export const reglementSchema = z.object({
  cible: z.enum(["facture", "commande_fournisseur"]),
  cibleId: z.coerce.number().int().positive(),
  montant: z.coerce.number().int().positive("Le montant doit être positif"),
  dateReglement: z.coerce.date(),
  moyen: z.enum(["ESPECES", "VIREMENT", "MOBILE_MONEY"]),
  commentaire: optionalTexte,
});
export type ReglementInput = z.infer<typeof reglementSchema>;

export const annulationSchema = z.object({
  motif: z.string().min(3, "Le motif est requis (3 caractères minimum)"),
});
export type AnnulationInput = z.infer<typeof annulationSchema>;

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
