"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, factures, reglements } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { ErreurMetier, messageErreurBase } from "@/lib/erreurs-base";
import { formatMontant } from "@/lib/format";
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
        // Verrou sur la ligne : deux règlements saisis en même temps sur la
        // même facture liraient sinon le même « montant réglé » et la
        // feraient dépasser son total.
        const [facture] = await tx
          .select()
          .from(factures)
          .where(eq(factures.id, cibleId))
          .limit(1)
          .for("update");
        if (!facture) throw new ErreurMetier("Facture introuvable.");
        if (facture.statut === "ANNULEE") throw new ErreurMetier("Cette facture est annulée.");
        const resteAPayer = facture.montantTotal - facture.montantRegle;
        if (montant > resteAPayer) {
          throw new ErreurMetier(
            `Le montant dépasse le reste à payer (${formatMontant(resteAPayer)}).`,
          );
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

        await enregistrerMouvementCaisse(tx, {
          reglementId: reglement.id,
          sens: "ENCAISSEMENT",
          montant,
          dateMouvement: dateReglement,
        });

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
          .limit(1)
          .for("update");
        if (!commande) throw new ErreurMetier("Commande fournisseur introuvable.");
        if (commande.statut === "ANNULEE") throw new ErreurMetier("Cette commande est annulée.");
        if (commande.statut === "BROUILLON") {
          throw new ErreurMetier("Cette commande est encore en brouillon : elle ne peut pas être réglée.");
        }
        const resteAPayer = commande.montantTotal - commande.montantRegle;
        if (montant > resteAPayer) {
          throw new ErreurMetier(
            `Le montant dépasse le reste à payer (${formatMontant(resteAPayer)}).`,
          );
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

        await enregistrerMouvementCaisse(tx, {
          reglementId: reglement.id,
          sens: "DECAISSEMENT",
          montant,
          dateMouvement: dateReglement,
        });

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
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/reglements");
  revalidatePath("/factures");
  revalidatePath("/commandes-fournisseur");
  revalidatePath("/caisse");
  return { error: null, success: true };
}
