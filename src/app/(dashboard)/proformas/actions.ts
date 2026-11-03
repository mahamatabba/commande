"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, clients, commandesClient, lignesCommandeClient, proformas } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import {
  annulationSchema,
  emissionProformaSchema,
  modificationProformaSchema,
} from "@/lib/validations";
import { tracerActivite } from "@/lib/journal";
import { genererNumero } from "@/lib/numerotation";
import { creerFactureDansTransaction } from "@/lib/facturation";
import { decomposerTva } from "@/lib/tva";
import { ErreurMetier, messageErreurBase } from "@/lib/erreurs-base";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Établit une facture proforma à partir d'une vente validée.
 *
 * Une proforma n'est pas une facture : rien n'entre en caisse, aucune créance
 * n'est ouverte, la vente reste au statut « Validée ». C'est un chiffrage
 * ferme remis au client pour qu'il obtienne son accord de dépense.
 *
 * Les montants sont figés ici, comme sur une facture, pour que la conversion
 * produise plus tard un document identique à celui remis au client.
 */
export async function emettreProforma(
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "factures:emettre");

  const parsed = emissionProformaSchema.safeParse({
    commandeClientId: formData.get("commandeClientId"),
    regimeTva: formData.get("regimeTva"),
    validiteJours: formData.get("validiteJours"),
    tauxTva: formData.get("tauxTva"),
    delaiLivraison: formData.get("delaiLivraison") ?? "",
    garantie: formData.get("garantie") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  let proformaId: number;
  try {
    proformaId = await db.transaction(async (tx) => {
      // Verrou sur la vente : il sérialise deux établissements simultanés, de
      // sorte que le second voie bien la proforma créée par le premier et se
      // heurte à l'index d'unicité plutôt que de créer un doublon.
      const [commande] = await tx
        .select()
        .from(commandesClient)
        .where(eq(commandesClient.id, parsed.data.commandeClientId))
        .limit(1)
        .for("update");

      if (!commande) throw new ErreurMetier("Commande introuvable.");
      if (commande.statut === "FACTUREE") {
        throw new ErreurMetier(
          "Cette vente est déjà facturée : une proforma n'a plus d'objet.",
        );
      }
      if (commande.statut !== "VALIDEE") {
        throw new ErreurMetier(
          "Seule une commande validée peut faire l'objet d'une proforma : " +
            "tant qu'elle est en brouillon, ses montants peuvent encore changer.",
        );
      }

      const [enCours] = await tx
        .select({ numero: proformas.numero })
        .from(proformas)
        .where(
          and(
            eq(proformas.commandeClientId, commande.id),
            eq(proformas.statut, "EMISE"),
          ),
        )
        .limit(1);
      if (enCours) {
        throw new ErreurMetier(
          `La proforma ${enCours.numero} est déjà en circulation pour cette vente. ` +
            "Annulez-la avant d'en établir une nouvelle.",
        );
      }

      const [client] = await tx
        .select({ nif: clients.nif })
        .from(clients)
        .where(eq(clients.id, commande.clientId))
        .limit(1);

      const totaux = decomposerTva(commande.montantTotal, {
        exonere: parsed.data.regimeTva === "EXONERE",
        taux: parsed.data.tauxTva,
      });

      const dateProforma = new Date();
      const dateValidite = new Date(dateProforma);
      dateValidite.setDate(dateValidite.getDate() + parsed.data.validiteJours);

      const numero = await genererNumero(tx, "PRO");

      const [proforma] = await tx
        .insert(proformas)
        .values({
          numero,
          commandeClientId: commande.id,
          clientId: commande.clientId,
          dateProforma,
          dateValidite,
          montantHt: totaux.montantHt,
          exonereTva: totaux.exonereTva,
          tauxTva: totaux.tauxTva,
          montantTva: totaux.montantTva,
          montantTotal: totaux.montantTotal,
          delaiLivraison: parsed.data.delaiLivraison,
          garantie: parsed.data.garantie,
          nifClient: client?.nif ?? null,
          createdBy: Number(session.user.id),
        })
        .returning({ id: proformas.id });

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "creation",
        entite: "proforma",
        entiteId: proforma.id,
        details: {
          numero,
          montantHt: totaux.montantHt,
          tauxTva: totaux.tauxTva,
          montantTotal: totaux.montantTotal,
          validiteJours: parsed.data.validiteJours,
        },
      });

      return proforma.id;
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/proformas");
  revalidatePath("/commandes-client");
  // `redirect` lève une exception de contrôle : il doit rester en dehors du
  // try, sinon il serait intercepté comme une erreur d'enregistrement.
  redirect(`/proformas/${proformaId}?nouveau=1`);
}

/**
 * Transforme une proforma en facture définitive.
 *
 * Le régime de TVA et le taux sont repris de la proforma, jamais recalculés :
 * le client a accepté un montant précis, la facture doit annoncer le même. Si
 * la vente a bougé entre-temps, la création échoue avec un message explicite
 * plutôt que de facturer autre chose que ce qui a été accepté.
 */
export async function convertirProformaEnFacture(
  id: number,
  // La conversion ne saisit aucune donnée : tout est repris de la proforma.
  // Les deux paramètres restent néanmoins là, car c'est la signature
  // qu'attend `useActionState` côté formulaire de confirmation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: EtatFormulaire,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "factures:emettre");

  let factureId: number;
  try {
    factureId = await db.transaction(async (tx) => {
      // Verrou sur la proforma : deux conversions lancées en même temps
      // verraient sinon toutes deux une proforma « EMISE » et créeraient
      // chacune leur facture.
      const [proforma] = await tx
        .select()
        .from(proformas)
        .where(eq(proformas.id, id))
        .limit(1)
        .for("update");

      if (!proforma) throw new ErreurMetier("Proforma introuvable.");
      if (proforma.statut === "CONVERTIE") {
        throw new ErreurMetier("Cette proforma a déjà été convertie en facture.");
      }
      if (proforma.statut === "ANNULEE") {
        throw new ErreurMetier("Cette proforma est annulée : elle ne peut plus être convertie.");
      }

      const facture = await creerFactureDansTransaction(tx, {
        commandeClientId: proforma.commandeClientId,
        exonere: proforma.exonereTva,
        taux: proforma.tauxTva,
        userId: Number(session.user.id),
        montantHtAttendu: proforma.montantHt,
        origine: { proformaId: proforma.id, proformaNumero: proforma.numero },
      });

      await tx
        .update(proformas)
        .set({ statut: "CONVERTIE", factureId: facture.id })
        .where(eq(proformas.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "conversion",
        entite: "proforma",
        entiteId: id,
        details: {
          numero: proforma.numero,
          numeroFacture: facture.numero,
          montantTotal: facture.totaux.montantTotal,
        },
      });

      return facture.id;
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/proformas");
  revalidatePath(`/proformas/${id}`);
  revalidatePath("/factures");
  revalidatePath("/commandes-client");
  revalidatePath("/caisse");
  redirect(`/factures/${factureId}?nouveau=1`);
}

/**
 * Annule une proforma restée sans suite (offre expirée, client qui renonce).
 * Aucune écriture comptable n'est reprise : une proforma n'en avait généré
 * aucune. L'annulation libère en revanche la vente pour un nouveau chiffrage.
 */
export async function annulerProforma(
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
      const [proforma] = await tx
        .select()
        .from(proformas)
        .where(eq(proformas.id, id))
        .limit(1)
        .for("update");

      if (!proforma) throw new ErreurMetier("Proforma introuvable.");
      if (proforma.statut === "ANNULEE") {
        throw new ErreurMetier("Cette proforma est déjà annulée.");
      }
      if (proforma.statut === "CONVERTIE") {
        throw new ErreurMetier(
          "Cette proforma a été convertie en facture : c'est la facture qu'il faut annuler.",
        );
      }

      await tx.update(proformas).set({ statut: "ANNULEE" }).where(eq(proformas.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "annulation",
        entite: "proforma",
        entiteId: id,
        details: { numero: proforma.numero, motif: parsed.data.motif },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/proformas");
  revalidatePath(`/proformas/${id}`);
  revalidatePath("/commandes-client");
  return { error: null, success: true };
}

/**
 * Modifie une proforma encore en circulation : prix ou quantités renégociés,
 * taux ou régime de TVA, validité, délai de livraison, garantie.
 *
 * Les lignes chiffrées d'une proforma sont celles de la vente : les modifier
 * ici réécrit donc les lignes de la vente, qui n'est pas encore facturée. Les
 * montants de la proforma sont recalculés et figés à nouveau, si bien que la
 * conversion produira une facture identique au document modifié.
 *
 * La date de validité repart de la date d'origine de la proforma : modifier
 * une offre ne la prolonge que si l'on augmente explicitement sa durée.
 */
export async function modifierProforma(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "factures:emettre");

  let lignesBrutes: unknown;
  try {
    lignesBrutes = JSON.parse(String(formData.get("lignes") ?? "[]"));
  } catch {
    return { error: "Lignes invalides.", success: false };
  }

  const parsed = modificationProformaSchema.safeParse({
    regimeTva: formData.get("regimeTva"),
    validiteJours: formData.get("validiteJours"),
    tauxTva: formData.get("tauxTva"),
    delaiLivraison: formData.get("delaiLivraison") ?? "",
    garantie: formData.get("garantie") ?? "",
    lignes: lignesBrutes,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }
  const { lignes } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [proforma] = await tx
        .select()
        .from(proformas)
        .where(eq(proformas.id, id))
        .limit(1)
        .for("update");

      if (!proforma) throw new ErreurMetier("Proforma introuvable.");
      if (proforma.statut !== "EMISE") {
        throw new ErreurMetier(
          proforma.statut === "CONVERTIE"
            ? "Cette proforma a déjà été convertie en facture : elle ne peut plus être modifiée."
            : "Cette proforma est annulée : elle ne peut plus être modifiée.",
        );
      }

      const [commande] = await tx
        .select()
        .from(commandesClient)
        .where(eq(commandesClient.id, proforma.commandeClientId))
        .limit(1)
        .for("update");
      if (!commande) throw new ErreurMetier("Vente introuvable.");
      if (commande.statut !== "VALIDEE") {
        throw new ErreurMetier("La vente liée n'est plus au statut « Validée » : modification impossible.");
      }

      const idsArticles = [...new Set(lignes.map((l) => l.articleId).filter((a): a is number => a != null))];
      const catalogue = idsArticles.length
        ? await tx
            .select({ id: articles.id, prixAchatIndicatif: articles.prixAchatIndicatif })
            .from(articles)
            .where(inArray(articles.id, idsArticles))
        : [];
      const parId = new Map(catalogue.map((a) => [a.id, a]));
      if (parId.size !== idsArticles.length) {
        throw new ErreurMetier("Un article de la proforma n'existe plus.");
      }

      // Prix d'achat des lignes existantes : conservés pour un article déjà
      // présent, afin que la marge ne bouge pas du seul fait d'une retouche.
      const anciennes = await tx
        .select({ articleId: lignesCommandeClient.articleId, prixAchatUnitaire: lignesCommandeClient.prixAchatUnitaire })
        .from(lignesCommandeClient)
        .where(eq(lignesCommandeClient.commandeId, commande.id));
      const prixAchatConnu = new Map(
        anciennes.filter((l) => l.articleId != null).map((l) => [l.articleId!, l.prixAchatUnitaire]),
      );

      const montantHt = lignes.reduce((s, l) => s + Math.round(l.quantite * l.prixUnitaire), 0);

      await tx.delete(lignesCommandeClient).where(eq(lignesCommandeClient.commandeId, commande.id));
      await tx.insert(lignesCommandeClient).values(
        lignes.map((l) => ({
          commandeId: commande.id,
          articleId: l.articleId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          montantLigne: Math.round(l.quantite * l.prixUnitaire),
          prixAchatUnitaire: l.articleId
            ? (prixAchatConnu.get(l.articleId) ?? parId.get(l.articleId)?.prixAchatIndicatif ?? null)
            : null,
        })),
      );
      await tx.update(commandesClient).set({ montantTotal: montantHt }).where(eq(commandesClient.id, commande.id));

      const totaux = decomposerTva(montantHt, {
        exonere: parsed.data.regimeTva === "EXONERE",
        taux: parsed.data.tauxTva,
      });
      const dateValidite = new Date(proforma.dateProforma);
      dateValidite.setDate(dateValidite.getDate() + parsed.data.validiteJours);

      await tx
        .update(proformas)
        .set({
          dateValidite,
          montantHt: totaux.montantHt,
          exonereTva: totaux.exonereTva,
          tauxTva: totaux.tauxTva,
          montantTva: totaux.montantTva,
          montantTotal: totaux.montantTotal,
          delaiLivraison: parsed.data.delaiLivraison,
          garantie: parsed.data.garantie,
        })
        .where(eq(proformas.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "modification",
        entite: "proforma",
        entiteId: id,
        details: {
          numero: proforma.numero,
          ancienMontantTotal: proforma.montantTotal,
          montantTotal: totaux.montantTotal,
          tauxTva: totaux.tauxTva,
        },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/proformas");
  revalidatePath(`/proformas/${id}`);
  revalidatePath("/commandes-client");
  redirect(`/proformas/${id}?modifiee=1`);
}

/**
 * Supprime définitivement une proforma ANNULÉE. Une proforma n'a produit
 * aucune écriture : la supprimer ne touche ni la caisse ni les ventes.
 */
export async function supprimerProforma(
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
      const [proforma] = await tx
        .select()
        .from(proformas)
        .where(eq(proformas.id, id))
        .limit(1)
        .for("update");
      if (!proforma) throw new ErreurMetier("Proforma introuvable.");
      if (proforma.statut !== "ANNULEE") {
        throw new ErreurMetier("Seule une proforma annulée peut être supprimée. Annulez-la d'abord.");
      }

      await tx.delete(proformas).where(eq(proformas.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "suppression",
        entite: "proforma",
        entiteId: id,
        details: { numero: proforma.numero, montantTotal: proforma.montantTotal, suppression: true },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/proformas");
  redirect("/proformas?supprimee=1");
}
