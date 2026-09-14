import { eq } from "drizzle-orm";
import type { Transaction } from "@/db";
import { clients, commandesClient, factures, reglements } from "@/db/schema";
import { ErreurMetier } from "@/lib/erreurs-base";
import { enregistrerMouvementCaisse } from "@/lib/caisse";
import { tracerActivite } from "@/lib/journal";
import { genererNumero } from "@/lib/numerotation";
import { decomposerTva, type DecompositionTva } from "@/lib/tva";

export type FactureCreee = {
  id: number;
  numero: string;
  totaux: DecompositionTva;
  /** Vente au comptant : l'encaissement a été enregistré automatiquement. */
  auComptant: boolean;
};

/**
 * Crée une facture à partir d'une commande client validée, à l'intérieur d'une
 * transaction déjà ouverte.
 *
 * Deux chemins mènent à une facture : l'émission directe depuis une vente, et
 * la conversion d'une proforma. Ils doivent produire exactement le même
 * résultat — même contrôle de statut, même numérotation, même encaissement
 * automatique au comptant, même trace. D'où cette fonction unique : dupliquer
 * ces règles, c'était accepter qu'elles divergent au premier correctif appliqué
 * d'un seul côté.
 *
 * La commande est verrouillée ici (`FOR UPDATE`) : c'est ce verrou qui empêche
 * deux émissions simultanées (double clic, deux onglets) de voir chacune une
 * commande « VALIDEE » et de créer chacune sa facture.
 */
export async function creerFactureDansTransaction(
  tx: Transaction,
  params: {
    commandeClientId: number;
    /** Régime retenu au moment d'émettre (ou figé sur la proforma). */
    exonere: boolean;
    /** Taux à appliquer. Omis, le taux standard en vigueur s'applique. */
    taux?: number;
    userId: number;
    /**
     * Montant hors taxe attendu. Fourni lors d'une conversion de proforma :
     * si la vente a changé entre-temps, mieux vaut refuser que facturer un
     * montant différent de celui remis au client.
     */
    montantHtAttendu?: number;
    /** Contexte ajouté au journal (ex : proforma d'origine). */
    origine?: Record<string, unknown>;
  },
): Promise<FactureCreee> {
  const [commande] = await tx
    .select()
    .from(commandesClient)
    .where(eq(commandesClient.id, params.commandeClientId))
    .limit(1)
    .for("update");

  if (!commande) throw new ErreurMetier("Commande introuvable.");
  if (commande.statut === "FACTUREE") {
    throw new ErreurMetier("Cette vente a déjà été facturée.");
  }
  if (commande.statut !== "VALIDEE") {
    throw new ErreurMetier("Seule une commande validée peut être facturée.");
  }

  if (
    params.montantHtAttendu !== undefined &&
    params.montantHtAttendu !== commande.montantTotal
  ) {
    throw new ErreurMetier(
      "Le montant de la vente a changé depuis l'établissement de la proforma. " +
        "Annulez cette proforma et établissez-en une nouvelle.",
    );
  }

  const [client] = await tx
    .select({ nif: clients.nif })
    .from(clients)
    .where(eq(clients.id, commande.clientId))
    .limit(1);

  // Les montants de la commande sont hors taxe : la TVA s'ajoute ici, selon le
  // régime retenu, et le taux appliqué est figé sur la facture pour qu'un
  // changement de taux légal ne réécrive pas le passé.
  const totaux = decomposerTva(commande.montantTotal, {
    exonere: params.exonere,
    taux: params.taux,
  });

  const numero = await genererNumero(tx, "FAC");
  const auComptant = commande.modeReglement === "ESPECES";
  const dateFacture = new Date();

  const [facture] = await tx
    .insert(factures)
    .values({
      numero,
      commandeClientId: commande.id,
      clientId: commande.clientId,
      dateFacture,
      montantHt: totaux.montantHt,
      exonereTva: totaux.exonereTva,
      tauxTva: totaux.tauxTva,
      montantTva: totaux.montantTva,
      montantTotal: totaux.montantTotal,
      montantRegle: auComptant ? totaux.montantTotal : 0,
      statut: auComptant ? "SOLDEE" : "NON_PAYEE",
      nifClient: client?.nif ?? null,
      createdBy: params.userId,
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
        montant: totaux.montantTotal,
        dateReglement: dateFacture,
        factureId: facture.id,
        moyen: "ESPECES",
        commentaire: "Encaissement automatique — vente au comptant",
        createdBy: params.userId,
      })
      .returning({ id: reglements.id });

    await enregistrerMouvementCaisse(tx, {
      reglementId: reglement.id,
      sens: "ENCAISSEMENT",
      montant: totaux.montantTotal,
      dateMouvement: dateFacture,
    });
  }

  await tracerActivite(tx, {
    userId: params.userId,
    action: "creation",
    entite: "facture",
    entiteId: facture.id,
    details: {
      numero,
      montantHt: totaux.montantHt,
      tauxTva: totaux.tauxTva,
      montantTva: totaux.montantTva,
      montantTotal: totaux.montantTotal,
      auComptant,
      ...params.origine,
    },
  });

  return { id: facture.id, numero, totaux, auComptant };
}
