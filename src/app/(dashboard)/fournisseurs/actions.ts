"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { fournisseurs } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { fournisseurSchema } from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";

export type EtatFormulaire = { error: string | null; success: boolean };

export async function creerFournisseur(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  const parsed = fournisseurSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const [fournisseur] = await db
    .insert(fournisseurs)
    .values(parsed.data)
    .returning({ id: fournisseurs.id });

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "creation",
    entite: "fournisseur",
    entiteId: fournisseur.id,
    details: parsed.data,
  });

  revalidatePath("/fournisseurs");
  return { error: null, success: true };
}

export async function modifierFournisseur(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  const parsed = fournisseurSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  await db.update(fournisseurs).set(parsed.data).where(eq(fournisseurs.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "fournisseur",
    entiteId: id,
    details: parsed.data,
  });

  revalidatePath("/fournisseurs");
  revalidatePath(`/fournisseurs/${id}`);
  return { error: null, success: true };
}

export async function basculerActifFournisseur(id: number, actif: boolean) {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  await db.update(fournisseurs).set({ actif }).where(eq(fournisseurs.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "fournisseur",
    entiteId: id,
    details: { actif },
  });

  revalidatePath("/fournisseurs");
  revalidatePath(`/fournisseurs/${id}`);
}
