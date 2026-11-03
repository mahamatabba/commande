import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { parametres } from "@/db/schema";

/**
 * Clés des visuels imprimés dans la zone de signature AEI des documents. Un
 * seul : le cachet de l'entreprise, qui porte déjà la signature du
 * responsable — une image de signature séparée ferait doublon.
 */
export const CLES_VISUELS = ["cachet"] as const;
export type CleVisuel = (typeof CLES_VISUELS)[number];

export type VisuelsSignature = { cachet: string | null };

/** Taille maximale d'une image importée (fichier d'origine). */
export const TAILLE_MAX_VISUEL_OCTETS = 600 * 1024;

/**
 * Seuls le PNG (idéal : fond transparent) et le JPEG sont acceptés : ce sont
 * les deux formats que le moteur PDF sait incruster.
 */
export const DATA_URI_IMAGE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/;

/** Lit le cachet signé enregistré (null s'il est absent). */
export async function lireVisuelsSignature(): Promise<VisuelsSignature> {
  const lignes = await db
    .select({ cle: parametres.cle, valeur: parametres.valeur })
    .from(parametres)
    .where(inArray(parametres.cle, [...CLES_VISUELS]));
  const parCle = new Map(lignes.map((l) => [l.cle, l.valeur]));
  return { cachet: parCle.get("cachet") ?? null };
}
