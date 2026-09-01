"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesClient, lignesCommandeClient } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { commandeClientSchema, annulationSchema } from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";
import { genererNumero } from "@/lib/numerotation";
import type { EtatFormulaire } from "@/lib/action-state";

export async function creerCommandeClient(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "commandes_client:write");

  let lignesBrutes: unknown;
  try {
    lignesBrutes = JSON.parse(String(formData.get("lignes") ?? "[]"));
  } catch {
    return { error: "Lignes invalides.", success: false };
  }

  const parsed = commandeClientSchema.safeParse({
    clientId: formData.get("clientId"),
    dateCommande: formData.get("dateCommande"),
    modeReglement: formData.get("modeReglement"),
    lignes: lignesBrutes,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const { clientId, dateCommande, modeReglement, lignes } = parsed.data;
  const montantTotal = lignes.reduce((s, l) => s + Math.round(l.quantite * l.prixUnitaire), 0);

  const commandeId = await db.transaction(async (tx) => {
    const numero = await genererNumero(tx, "CC");

    const [commande] = await tx
      .insert(commandesClient)
      .values({
        numero,
        clientId,
        dateCommande,
        modeReglement,
        montantTotal,
        createdBy: Number(session.user.id),
      })
      .returning({ id: commandesClient.id });

    await tx.insert(lignesCommandeClient).values(
      lignes.map((l) => ({
        commandeId: commande.id,
        articleId: l.articleId,
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        montantLigne: Math.round(l.quantite * l.prixUnitaire),
      })),
    );

    await tracerActivite(tx, {
      userId: Number(session.user.id),
      action: "creation",
      entite: "commande_client",
      entiteId: commande.id,
      details: { numero, montantTotal, modeReglement },
    });

    return commande.id;
  });

  revalidatePath("/commandes-client");
  redirect(`/commandes-client/${commandeId}`);
}

export async function validerCommandeClient(id: number) {
  const session = await auth();
  requirePermission(session, "commandes_client:write");

  const [commande] = await db
    .select()
    .from(commandesClient)
    .where(eq(commandesClient.id, id))
    .limit(1);
  if (!commande) throw new Error("Commande introuvable.");
  if (commande.statut !== "BROUILLON") {
    throw new Error(`Statut actuel invalide pour cette action (${commande.statut}).`);
  }

  await db.update(commandesClient).set({ statut: "VALIDEE" }).where(eq(commandesClient.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "validation",
    entite: "commande_client",
    entiteId: id,
    details: { statut: "VALIDEE" },
  });

  revalidatePath("/commandes-client");
  revalidatePath(`/commandes-client/${id}`);
}

export async function annulerCommandeClient(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "annulation:effectuer");

  const parsed = annulationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const [commande] = await db
    .select()
    .from(commandesClient)
    .where(eq(commandesClient.id, id))
    .limit(1);
  if (!commande) return { error: "Commande introuvable.", success: false };
  if (commande.statut === "ANNULEE" || commande.statut === "FACTUREE") {
    return {
      error:
        commande.statut === "FACTUREE"
          ? "Cette commande a déjà été facturée ; il faut annuler la facture correspondante."
          : "Cette commande est déjà annulée.",
      success: false,
    };
  }

  await db.update(commandesClient).set({ statut: "ANNULEE" }).where(eq(commandesClient.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "annulation",
    entite: "commande_client",
    entiteId: id,
    details: { motif: parsed.data.motif },
  });

  revalidatePath("/commandes-client");
  revalidatePath(`/commandes-client/${id}`);
  return { error: null, success: true };
}
