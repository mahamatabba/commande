"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { articleSchema } from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";

export type EtatFormulaire = {
  error: string | null;
  success: boolean;
  article?: { id: number; code: string; designation: string; prixAchatIndicatif: number; prixVente: number };
};

export async function creerArticle(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const [article] = await db.insert(articles).values(parsed.data).returning({
    id: articles.id,
    code: articles.code,
    designation: articles.designation,
    prixAchatIndicatif: articles.prixAchatIndicatif,
    prixVente: articles.prixVente,
  });

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "creation",
    entite: "article",
    entiteId: article.id,
    details: parsed.data,
  });

  revalidatePath("/articles");
  return { error: null, success: true, article };
}

export async function modifierArticle(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  await db.update(articles).set(parsed.data).where(eq(articles.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "article",
    entiteId: id,
    details: parsed.data,
  });

  revalidatePath("/articles");
  return { error: null, success: true };
}

export async function basculerActifArticle(id: number, actif: boolean) {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  await db.update(articles).set({ actif }).where(eq(articles.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "article",
    entiteId: id,
    details: { actif },
  });

  revalidatePath("/articles");
}
