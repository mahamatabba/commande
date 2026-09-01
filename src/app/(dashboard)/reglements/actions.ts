"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, factures, reglements } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { reglementSchema } from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";
import { enregistrerMouvementCaisse } from "@/lib/caisse";
import type { EtatFormulaire } from "@/lib/action-state";

export async function saisirReglement(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "reglements:saisir");

  const parsed = reglementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }
  const { cible, cibleId, montant, dateReglement, moyen, commentaire } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      if (cible === "facture") {
        const [facture] = await tx.select().from(factures).where(eq(factures.id, cibleId)).limit(1);
        if (!facture) throw new Error("Facture introuvable.");
        if (facture.statut === "ANNULEE") throw new Error("Cette facture est annulée.");
        const resteAPayer = facture.montantTotal - facture.montantRegle;
        if (montant > resteAPayer) {
          throw new Error(`Le montant dépasse le reste à payer (${resteAPayer} FCFA).`);
        }

        const nouveauMontantRegle = facture.montantRegle + montant;
        const nouveauStatut = nouveauMontantRegle >= facture.montantTotal ? "SOLDEE" : "PARTIELLEMENT_PAYEE";

        await tx
          .update(factures)
          .set({ montantRegle: nouveauMontantRegle, statut: nouveauStatut })
          .where(eq(factures.id, cibleId));

        const [reglement] = await tx
          .insert(reglements)
          .values({
            sens: "ENCAISSEMENT",
            montant,
            dateReglement,
            factureId: cibleId,
            moyen,
            commentaire,
            createdBy: Number(session.user.id),
          })
          .returning({ id: reglements.id });

        await enregistrerMouvementCaisse(tx, { reglementId: reglement.id, sens: "ENCAISSEMENT", montant });

        await tracerActivite(tx, {
          userId: Number(session.user.id),
          action: "reglement",
          entite: "reglement",
          entiteId: reglement.id,
          details: { cible, cibleId, montant },
        });
      } else {
        const [commande] = await tx
          .select()
          .from(commandesFournisseur)
          .where(eq(commandesFournisseur.id, cibleId))
          .limit(1);
        if (!commande) throw new Error("Commande fournisseur introuvable.");
        if (commande.statut === "ANNULEE") throw new Error("Cette commande est annulée.");
        const resteAPayer = commande.montantTotal - commande.montantRegle;
        if (montant > resteAPayer) {
          throw new Error(`Le montant dépasse le reste à payer (${resteAPayer} FCFA).`);
        }

        await tx
          .update(commandesFournisseur)
          .set({ montantRegle: commande.montantRegle + montant })
          .where(eq(commandesFournisseur.id, cibleId));

        const [reglement] = await tx
          .insert(reglements)
          .values({
            sens: "DECAISSEMENT",
            montant,
            dateReglement,
            commandeFournisseurId: cibleId,
            moyen,
            commentaire,
            createdBy: Number(session.user.id),
          })
          .returning({ id: reglements.id });

        await enregistrerMouvementCaisse(tx, { reglementId: reglement.id, sens: "DECAISSEMENT", montant });

        await tracerActivite(tx, {
          userId: Number(session.user.id),
          action: "reglement",
          entite: "reglement",
          entiteId: reglement.id,
          details: { cible, cibleId, montant },
        });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur lors de l'enregistrement.", success: false };
  }

  revalidatePath("/reglements");
  revalidatePath("/factures");
  revalidatePath("/commandes-fournisseur");
  revalidatePath("/caisse");
  return { error: null, success: true };
}
