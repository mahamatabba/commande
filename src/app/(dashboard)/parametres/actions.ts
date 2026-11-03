"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { parametres } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { tracerActivite } from "@/lib/journal";
import { CLES_VISUELS, DATA_URI_IMAGE, TAILLE_MAX_VISUEL_OCTETS } from "@/lib/parametres";
import type { EtatFormulaire } from "@/lib/action-state";

// Un data URI base64 pèse environ 4/3 du fichier d'origine.
const LONGUEUR_MAX = Math.ceil((TAILLE_MAX_VISUEL_OCTETS * 4) / 3) + 64;

const visuelSchema = z.object({
  cle: z.enum(CLES_VISUELS),
  image: z
    .string()
    .max(LONGUEUR_MAX, "Image trop lourde (600 Ko maximum).")
    .regex(DATA_URI_IMAGE, "Format non pris en charge : utilisez une image PNG ou JPEG."),
});

const LIBELLE = { cachet: "cachet signé" } as const;

/**
 * Enregistre (ou remplace) le cachet signé imprimé dans la zone de signature
 * AEI de tous les documents. Réservé à l'administrateur.
 */
export async function enregistrerVisuel(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");

  const parsed = visuelSchema.safeParse({ cle: formData.get("cle"), image: formData.get("image") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false };
  const { cle, image } = parsed.data;

  await db
    .insert(parametres)
    .values({ cle, valeur: image })
    .onConflictDoUpdate({ target: parametres.cle, set: { valeur: image, updatedAt: new Date() } });

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "parametres",
    details: { parametre: LIBELLE[cle], operation: "import" },
  });

  revalidatePath("/parametres");
  return { error: null, success: true };
}

export async function supprimerVisuel(
  cle: (typeof CLES_VISUELS)[number],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: EtatFormulaire,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");
  if (!CLES_VISUELS.includes(cle)) return { error: "Paramètre inconnu.", success: false };

  await db.delete(parametres).where(eq(parametres.cle, cle));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "suppression",
    entite: "parametres",
    details: { parametre: LIBELLE[cle], operation: "retrait" },
  });

  revalidatePath("/parametres");
  return { error: null, success: true };
}
