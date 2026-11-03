"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesClient, factures, mouvementsCaisse, proformas, reglements } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import {
  annulationSchema,
  emissionFactureSchema,
  marquagePaiementSchema,
} from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";
import { enregistrerMouvementCaisse } from "@/lib/caisse";
import { creerFactureDansTransaction } from "@/lib/facturation";
import { ErreurMetier, messageErreurBase } from "@/lib/erreurs-base";
import type { EtatFormulaire } from "@/lib/action-state";

export async function emettreFacture(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "factures:emettre");

  const parsed = emissionFactureSchema.safeParse({
    commandeClientId: formData.get("commandeClientId"),
    regimeTva: formData.get("regimeTva"),
    tauxTva: formData.get("tauxTva"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  let factureId: number;
  try {
    factureId = await db.transaction(async (tx) => {
      // Toute la règle de facturation (verrou sur la vente, contrôle de
      // statut, TVA, numérotation, encaissement au comptant, trace) vit dans
      // `creerFactureDansTransaction` : la conversion d'une proforma emprunte
      // exactement le même chemin.
      const facture = await creerFactureDansTransaction(tx, {
        commandeClientId: parsed.data.commandeClientId,
        exonere: parsed.data.regimeTva === "EXONERE",
        taux: parsed.data.tauxTva,
        userId: Number(session.user.id),
      });
      return facture.id;
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/factures");
  revalidatePath("/commandes-client");
  revalidatePath("/caisse");
  // `redirect` lève une exception de contrôle : il doit rester en dehors du
  // try, sinon il serait intercepté comme une erreur d'enregistrement.
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

  try {
    await db.transaction(async (tx) => {
      // Verrou de ligne : deux annulations simultanées lisaient toutes deux
      // un statut non annulé et généraient chacune leur décaissement de
      // reprise, amputant la caisse deux fois du même montant.
      const [facture] = await tx
        .select()
        .from(factures)
        .where(eq(factures.id, id))
        .limit(1)
        .for("update");

      if (!facture) throw new ErreurMetier("Facture introuvable.");
      if (facture.statut === "ANNULEE") {
        throw new ErreurMetier("Cette facture est déjà annulée.");
      }

      const dateAnnulation = new Date();

      if (facture.montantRegle > 0) {
        const [reglementReprise] = await tx
          .insert(reglements)
          .values({
            sens: "DECAISSEMENT",
            montant: facture.montantRegle,
            dateReglement: dateAnnulation,
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
          dateMouvement: dateAnnulation,
        });
      }

      // `montantRegle` doit repartir à zéro : `resteAPayer` est une colonne
      // calculée (montantTotal - montantRegle). Sans cette remise à zéro, la
      // facture annulée affichait « réglé : tout, reste : 0 », c'est-à-dire
      // exactement le contraire de ce que disait son historique.
      await tx
        .update(factures)
        .set({ statut: "ANNULEE", montantRegle: 0 })
        .where(eq(factures.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "annulation",
        entite: "facture",
        entiteId: id,
        details: { motif: parsed.data.motif, montantRepris: facture.montantRegle },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  revalidatePath("/caisse");
  revalidatePath("/reglements");
  return { error: null, success: true };
}

/**
 * Passe une facture de « non payée » (ou « partiellement payée ») à
 * « soldée », directement depuis l'écran de la facture.
 *
 * Le statut n'est PAS modifié seul : encaisser, c'est faire entrer de l'argent.
 * L'action enregistre donc un véritable règlement du reste à payer et le
 * mouvement de caisse correspondant. Sans cela, la facture aurait dit « payée »
 * pendant que la caisse, les règlements et les statistiques auraient continué
 * d'ignorer la somme — exactement le genre d'écart qu'on ne retrouve qu'au
 * moment de compter le tiroir.
 *
 * C'est la permission « saisir un règlement » qui gouverne, et non
 * « émettre une facture » : l'acte réel est un encaissement.
 */
export async function marquerFacturePayee(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "reglements:saisir");

  const parsed = marquagePaiementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }
  const { dateReglement, moyen, commentaire } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      // Verrou de ligne : sans lui, un règlement partiel saisi au même instant
      // depuis l'écran Règlements et ce marquage liraient le même « déjà
      // réglé » et encaisseraient deux fois le solde.
      const [facture] = await tx
        .select()
        .from(factures)
        .where(eq(factures.id, id))
        .limit(1)
        .for("update");

      if (!facture) throw new ErreurMetier("Facture introuvable.");
      if (facture.statut === "ANNULEE") {
        throw new ErreurMetier("Cette facture est annulée : elle ne peut pas être encaissée.");
      }

      const resteAPayer = facture.montantTotal - facture.montantRegle;
      if (resteAPayer <= 0) {
        throw new ErreurMetier("Cette facture est déjà entièrement réglée.");
      }

      await tx
        .update(factures)
        .set({ montantRegle: facture.montantTotal, statut: "SOLDEE" })
        .where(eq(factures.id, id));

      const [reglement] = await tx
        .insert(reglements)
        .values({
          sens: "ENCAISSEMENT",
          montant: resteAPayer,
          dateReglement,
          factureId: id,
          moyen,
          commentaire: commentaire ?? `Solde de la facture ${facture.numero}`,
          createdBy: Number(session.user.id),
        })
        .returning({ id: reglements.id });

      await enregistrerMouvementCaisse(tx, {
        reglementId: reglement.id,
        sens: "ENCAISSEMENT",
        montant: resteAPayer,
        dateMouvement: dateReglement,
      });

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "reglement",
        entite: "reglement",
        entiteId: reglement.id,
        details: { cible: "facture", cibleId: id, montant: resteAPayer },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  revalidatePath("/caisse");
  revalidatePath("/reglements");
  return { error: null, success: true };
}

/**
 * Supprime définitivement une facture ANNULÉE.
 *
 * Seule une facture déjà annulée peut l'être : l'annulation a fait le travail
 * comptable (reprise en caisse de tout ce qui avait été encaissé). Ses
 * règlements s'équilibrent donc — encaissements et décaissements de reprise
 * s'annulent — et les effacer avec leurs mouvements de caisse laisse le solde
 * de caisse inchangé. Le contrôle est refait ici : si la somme ne s'équilibre
 * pas, rien n'est supprimé.
 *
 * La vente d'origine repasse au statut « Validée » : elle peut alors être
 * refacturée correctement, ou annulée à son tour. La suppression reste tracée
 * au journal avec le numéro et le montant de la facture.
 */
export async function supprimerFacture(
  id: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: EtatFormulaire,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "annulation:effectuer");

  try {
    await db.transaction(async (tx) => {
      const [facture] = await tx
        .select()
        .from(factures)
        .where(eq(factures.id, id))
        .limit(1)
        .for("update");

      if (!facture) throw new ErreurMetier("Facture introuvable.");
      if (facture.statut !== "ANNULEE") {
        throw new ErreurMetier("Seule une facture annulée peut être supprimée. Annulez-la d'abord.");
      }

      const lignesReglement = await tx
        .select({ id: reglements.id, sens: reglements.sens, montant: reglements.montant })
        .from(reglements)
        .where(eq(reglements.factureId, id));

      const solde = lignesReglement.reduce(
        (s, r) => s + (r.sens === "ENCAISSEMENT" ? r.montant : -r.montant),
        0,
      );
      if (solde !== 0) {
        throw new ErreurMetier(
          "Les règlements de cette facture ne s'équilibrent pas : la supprimer modifierait le solde de caisse.",
        );
      }

      const idsReglements = lignesReglement.map((r) => r.id);
      if (idsReglements.length > 0) {
        await tx.execute(sql`LOCK TABLE mouvements_caisse IN SHARE ROW EXCLUSIVE MODE`);
        await tx.delete(mouvementsCaisse).where(inArray(mouvementsCaisse.reglementId, idsReglements));
        await tx.delete(reglements).where(inArray(reglements.id, idsReglements));
      }

      // Une proforma convertie en cette facture perd son lien : elle est
      // classée annulée, puisque la facture qu'elle a produite n'existe plus.
      await tx
        .update(proformas)
        .set({ statut: "ANNULEE", factureId: null })
        .where(eq(proformas.factureId, id));

      await tx.delete(factures).where(eq(factures.id, id));

      await tx
        .update(commandesClient)
        .set({ statut: "VALIDEE" })
        .where(eq(commandesClient.id, facture.commandeClientId));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "suppression",
        entite: "facture",
        entiteId: id,
        details: {
          numero: facture.numero,
          montantTotal: facture.montantTotal,
          reglementsSupprimes: idsReglements.length,
        },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/factures");
  revalidatePath("/commandes-client");
  revalidatePath("/proformas");
  revalidatePath("/caisse");
  revalidatePath("/reglements");
  redirect("/factures?supprimee=1");
}
