import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { parametres } from "@/db/schema";

/** Clés des visuels imprimés dans la zone de signature AEI des documents. */
export const CLES_VISUELS = ["signature", "cachet"] as const;
export type CleVisuel = (typeof CLES_VISUELS)[number];

export type VisuelsSignature = { signature: string | null; cachet: string | null };

/** Taille maximale d'une image importée (fichier d'origine). */
export const TAILLE_MAX_VISUEL_OCTETS = 600 * 1024;

/**
 * Seuls le PNG (idéal : fond transparent) et le JPEG sont acceptés : ce sont
 * les deux formats que le moteur PDF sait incruster.
 */
export const DATA_URI_IMAGE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/;

/** Lit la signature et le cachet enregistrés (null si absents). */
export async function lireVisuelsSignature(): Promise<VisuelsSignature> {
  const lignes = await db
    .select({ cle: parametres.cle, valeur: parametres.valeur })
    .from(parametres)
    .where(inArray(parametres.cle, [...CLES_VISUELS]));
  const parCle = new Map(lignes.map((l) => [l.cle, l.valeur]));
  return { signature: parCle.get("signature") ?? null, cachet: parCle.get("cachet") ?? null };
}
