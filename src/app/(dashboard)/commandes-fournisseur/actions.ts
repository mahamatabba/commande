"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, lignesCommandeFournisseur } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { commandeFournisseurSchema, annulationSchema } from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";
import { genererNumero } from "@/lib/numerotation";
import type { EtatFormulaire } from "@/lib/action-state";

export async function creerCommandeFournisseur(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "commandes_fournisseur:write");

  let lignesBrutes: unknown;
  try {
    lignesBrutes = JSON.parse(String(formData.get("lignes") ?? "[]"));
  } catch {
    return { error: "Lignes invalides.", success: false };
  }

  const parsed = commandeFournisseurSchema.safeParse({
    fournisseurId: formData.get("fournisseurId"),
    dateCommande: formData.get("dateCommande"),
    lignes: lignesBrutes,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const { fournisseurId, dateCommande, lignes } = parsed.data;
  const montantTotal = lignes.reduce((s, l) => s + Math.round(l.quantite * l.prixUnitaire), 0);

  const commandeId = await db.transaction(async (tx) => {
    const numero = await genererNumero(tx, "CF");

    const [commande] = await tx
      .insert(commandesFournisseur)
      .values({
        numero,
        fournisseurId,
        dateCommande,
        montantTotal,
        createdBy: Number(session.user.id),
      })
      .returning({ id: commandesFournisseur.id });

    await tx.insert(lignesCommandeFournisseur).values(
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
      entite: "commande_fournisseur",
      entiteId: commande.id,
      details: { numero, montantTotal },
    });

    return commande.id;
  });

  revalidatePath("/commandes-fournisseur");
  redirect(`/commandes-fournisseur/${commandeId}?nouveau=1`);
}

async function changerStatut(
  id: number,
  statutAttendu: "BROUILLON" | "VALIDEE",
  statutSuivant: "VALIDEE" | "RECUE",
) {
  const session = await auth();
  requirePermission(session, "commandes_fournisseur:write");

  const [commande] = await db
    .select()
    .from(commandesFournisseur)
    .where(eq(commandesFournisseur.id, id))
    .limit(1);
  if (!commande) throw new Error("Commande introuvable.");
  if (commande.statut !== statutAttendu) {
    throw new Error(`Statut actuel invalide pour cette action (${commande.statut}).`);
  }

  await db.update(commandesFournisseur).set({ statut: statutSuivant }).where(eq(commandesFournisseur.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "validation",
    entite: "commande_fournisseur",
    entiteId: id,
    details: { statut: statutSuivant },
  });

  revalidatePath("/commandes-fournisseur");
  revalidatePath(`/commandes-fournisseur/${id}`);
}

export async function validerCommandeFournisseur(id: number) {
  await changerStatut(id, "BROUILLON", "VALIDEE");
}

export async function recevoirCommandeFournisseur(id: number) {
  await changerStatut(id, "VALIDEE", "RECUE");
}

export async function annulerCommandeFournisseur(
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
    .from(commandesFournisseur)
    .where(eq(commandesFournisseur.id, id))
    .limit(1);
  if (!commande) return { error: "Commande introuvable.", success: false };
  if (commande.statut === "ANNULEE" || commande.statut === "RECUE") {
    return { error: `Une commande ${commande.statut === "RECUE" ? "déjà reçue" : "déjà annulée"} ne peut plus être annulée.`, success: false };
  }
  if (commande.montantRegle > 0) {
    return {
      error: "Cette commande a déjà des paiements enregistrés ; elle ne peut pas être annulée directement.",
      success: false,
    };
  }

  await db
    .update(commandesFournisseur)
    .set({ statut: "ANNULEE" })
    .where(eq(commandesFournisseur.id, id));

  await tracerActivite(db, {
    userId: Number(session.user.id),
    action: "annulation",
    entite: "commande_fournisseur",
    entiteId: id,
    details: { motif: parsed.data.motif },
  });

  revalidatePath("/commandes-fournisseur");
  revalidatePath(`/commandes-fournisseur/${id}`);
  return { error: null, success: true };
}
