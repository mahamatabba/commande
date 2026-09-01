"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { clientSchema } from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";

export type EtatFormulaire = {
  error: string | null;
  success: boolean;
  client?: { id: number; nom: string; prenom: string | null; raisonSociale: string | null };
};

export async function creerClient(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const [client] = await db.insert(clients).values(parsed.data).returning({
    id: clients.id,
    nom: clients.nom,
    prenom: clients.prenom,
    raisonSociale: clients.raisonSociale,
  });

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "creation",
    entite: "client",
    entiteId: client.id,
    details: parsed.data,
  });

  revalidatePath("/clients");
  return { error: null, success: true, client };
}

export async function modifierClient(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  await db.update(clients).set(parsed.data).where(eq(clients.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "client",
    entiteId: id,
    details: parsed.data,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { error: null, success: true };
}

export async function basculerActifClient(id: number, actif: boolean) {
  const session = await auth();
  requirePermission(session, "referentiels:write");

  await db.update(clients).set({ actif }).where(eq(clients.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "modification",
    entite: "client",
    entiteId: id,
    details: { actif },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}
