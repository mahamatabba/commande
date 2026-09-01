"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import {
  utilisateurCreationSchema,
  utilisateurModificationSchema,
} from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";
import type { EtatFormulaire } from "@/lib/action-state";

const motDePasseSchema = utilisateurCreationSchema.pick({ motDePasse: true });

export async function creerUtilisateur(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");

  const parsed = utilisateurCreationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }
  const { email, nomComplet, role, motDePasse } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(motDePasse, 10);
    const [utilisateur] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), nomComplet, role, passwordHash })
      .returning({ id: users.id });

    await tracerActivite(db, {
      userId: Number(session.user.id),
      action: "creation",
      entite: "utilisateur",
      entiteId: utilisateur.id,
      details: { email, nomComplet, role },
    });
  } catch (e) {
    const message =
      e instanceof Error && e.message.includes("unique")
        ? "Un utilisateur avec cet email existe déjà."
        : "Impossible de créer l'utilisateur.";
    return { error: message, success: false };
  }

  revalidatePath("/utilisateurs");
  return { error: null, success: true };
}

export async function modifierUtilisateur(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");

  const parsed = utilisateurModificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }
  const { nomComplet, role, actif } = parsed.data;

  if (id === Number(session.user.id) && !actif) {
    return { error: "Vous ne pouvez pas désactiver votre propre compte.", success: false };
  }
  if (id === Number(session.user.id) && role !== "ADMIN") {
    return { error: "Vous ne pouvez pas retirer votre propre rôle d'administrateur.", success: false };
  }

  await db.update(users).set({ nomComplet, role, actif }).where(eq(users.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "utilisateur",
    entiteId: id,
    details: { nomComplet, role, actif },
  });

  revalidatePath("/utilisateurs");
  return { error: null, success: true };
}

export async function reinitialiserMotDePasse(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");

  const parsed = motDePasseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const passwordHash = await bcrypt.hash(parsed.data.motDePasse, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "utilisateur",
    entiteId: id,
    details: { motDePasseReinitialise: true },
  });

  revalidatePath("/utilisateurs");
  return { error: null, success: true };
}
