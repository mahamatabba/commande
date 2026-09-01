"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesClient, factures, reglements } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { emissionFactureSchema, annulationSchema } from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";
import { genererNumero } from "@/lib/numerotation";
import { enregistrerMouvementCaisse } from "@/lib/caisse";
import type { EtatFormulaire } from "@/lib/action-state";

export async function emettreFacture(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "factures:emettre");

  const parsed = emissionFactureSchema.safeParse({
    commandeClientId: formData.get("commandeClientId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  const commande = await db.query.commandesClient.findFirst({
    where: (c, { eq }) => eq(c.id, parsed.data.commandeClientId),
    with: { client: true },
  });
  if (!commande) return { error: "Commande introuvable.", success: false };
  if (commande.statut !== "VALIDEE") {
    return { error: "Seule une commande validée peut être facturée.", success: false };
  }

  const factureId = await db.transaction(async (tx) => {
    const numero = await genererNumero(tx, "FAC");
    const auComptant = commande.modeReglement === "ESPECES";

    const [facture] = await tx
      .insert(factures)
      .values({
        numero,
        commandeClientId: commande.id,
        clientId: commande.clientId,
        dateFacture: new Date(),
        montantTotal: commande.montantTotal,
        montantRegle: auComptant ? commande.montantTotal : 0,
        statut: auComptant ? "SOLDEE" : "NON_PAYEE",
        nifClient: commande.client.nif,
        createdBy: Number(session.user.id),
      })
      .returning({ id: factures.id });

    await tx
      .update(commandesClient)
      .set({ statut: "FACTUREE" })
      .where(eq(commandesClient.id, commande.id));

    if (auComptant) {
      const [reglement] = await tx
        .insert(reglements)
        .values({
          sens: "ENCAISSEMENT",
          montant: commande.montantTotal,
          dateReglement: new Date(),
          factureId: facture.id,
          moyen: "ESPECES",
          commentaire: "Encaissement automatique — vente au comptant",
          createdBy: Number(session.user.id),
        })
        .returning({ id: reglements.id });

      await enregistrerMouvementCaisse(tx, {
        reglementId: reglement.id,
        sens: "ENCAISSEMENT",
        montant: commande.montantTotal,
      });
    }

    await tracerActivite(tx, {
      userId: Number(session.user.id),
      action: "creation",
      entite: "facture",
      entiteId: facture.id,
      details: { numero, montantTotal: commande.montantTotal, auComptant },
    });

    return facture.id;
  });

  revalidatePath("/factures");
  revalidatePath("/commandes-client");
  redirect(`/factures/${factureId}?nouveau=1`);
}

export async function annulerFacture(
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

  const [facture] = await db.select().from(factures).where(eq(factures.id, id)).limit(1);
  if (!facture) return { error: "Facture introuvable.", success: false };
  if (facture.statut === "ANNULEE") {
    return { error: "Cette facture est déjà annulée.", success: false };
  }

  await db.transaction(async (tx) => {
    if (facture.montantRegle > 0) {
      const [reglementReprise] = await tx
        .insert(reglements)
        .values({
          sens: "DECAISSEMENT",
          montant: facture.montantRegle,
          dateReglement: new Date(),
          factureId: facture.id,
          moyen: "ESPECES",
          commentaire: `Reprise suite à l'annulation de la facture ${facture.numero}`,
          createdBy: Number(session.user.id),
        })
        .returning({ id: reglements.id });

      await enregistrerMouvementCaisse(tx, {
        reglementId: reglementReprise.id,
        sens: "DECAISSEMENT",
        montant: facture.montantRegle,
      });
    }

    await tx.update(factures).set({ statut: "ANNULEE" }).where(eq(factures.id, id));

    await tracerActivite(tx, {
      userId: Number(session.user.id),
      action: "annulation",
      entite: "facture",
      entiteId: id,
      details: { motif: parsed.data.motif, montantRepris: facture.montantRegle },
    });
  });

  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  revalidatePath("/caisse");
  return { error: null, success: true };
}
