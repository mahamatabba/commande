"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, clients, commandesClient, lignesCommandeClient } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { ErreurMetier, messageErreurBase } from "@/lib/erreurs-base";
import {
  commandeClientSchema,
  annulationSchema,
  correctionCommandeClientSchema,
} from "@/lib/validations";
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

  let commandeId: number;
  try {
    commandeId = await db.transaction(async (tx) => {
      // Le formulaire est une liste déroulante, mais rien n'empêche d'envoyer
      // un identifiant arbitraire : le serveur revérifie que le client et les
      // articles existent et sont toujours actifs.
      const [client] = await tx
        .select({ actif: clients.actif })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
      if (!client) throw new ErreurMetier("Client introuvable.");
      if (!client.actif) throw new ErreurMetier("Ce client est désactivé : il ne peut plus passer commande.");

      const idsArticles = [...new Set(lignes.map((l) => l.articleId).filter((id): id is number => id != null))];
      const catalogue = idsArticles.length
        ? await tx
            .select({
              id: articles.id,
              actif: articles.actif,
              designation: articles.designation,
              prixAchatIndicatif: articles.prixAchatIndicatif,
            })
            .from(articles)
            .where(inArray(articles.id, idsArticles))
        : [];
      const parId = new Map(catalogue.map((a) => [a.id, a]));
      for (const id of idsArticles) {
        const article = parId.get(id);
        if (!article) throw new ErreurMetier("Un article de la commande n'existe plus.");
        if (!article.actif) {
          throw new ErreurMetier(`L'article « ${article.designation} » est désactivé.`);
        }
      }

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
          // Prix d'achat figé au moment de la vente : la marge historique ne
          // doit pas changer quand le tarif du fournisseur évolue ensuite.
          prixAchatUnitaire: l.articleId ? (parId.get(l.articleId)?.prixAchatIndicatif ?? null) : null,
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
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/commandes-client");
  redirect(`/commandes-client/${commandeId}?nouveau=1`);
}

export async function validerCommandeClient(id: number) {
  const session = await auth();
  requirePermission(session, "commandes_client:write");

  // Verrou + trace dans la même transaction : deux clics rapprochés ne
  // peuvent plus valider deux fois, et le journal suit toujours l'écriture.
  await db.transaction(async (tx) => {
    const [commande] = await tx
      .select()
      .from(commandesClient)
      .where(eq(commandesClient.id, id))
      .limit(1)
      .for("update");
    if (!commande) throw new ErreurMetier("Commande introuvable.");
    if (commande.statut !== "BROUILLON") {
      throw new ErreurMetier(`Statut actuel invalide pour cette action (${commande.statut}).`);
    }

    await tx.update(commandesClient).set({ statut: "VALIDEE" }).where(eq(commandesClient.id, id));

    await tracerActivite(tx, {
      userId: Number(session.user.id),
      action: "validation",
      entite: "commande_client",
      entiteId: id,
      details: { statut: "VALIDEE" },
    });
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

  try {
    await db.transaction(async (tx) => {
      const [commande] = await tx
        .select()
        .from(commandesClient)
        .where(eq(commandesClient.id, id))
        .limit(1)
        .for("update");
      if (!commande) throw new ErreurMetier("Commande introuvable.");
      if (commande.statut === "ANNULEE" || commande.statut === "FACTUREE") {
        throw new ErreurMetier(
          commande.statut === "FACTUREE"
            ? "Cette commande a déjà été facturée ; il faut annuler la facture correspondante."
            : "Cette commande est déjà annulée.",
        );
      }

      await tx.update(commandesClient).set({ statut: "ANNULEE" }).where(eq(commandesClient.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "annulation",
        entite: "commande_client",
        entiteId: id,
        details: { motif: parsed.data.motif },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/commandes-client");
  revalidatePath(`/commandes-client/${id}`);
  return { error: null, success: true };
}

export async function corrigerCommandeClient(
  id: number,
  _prevState: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();
  requirePermission(session, "commandes_client:corriger");

  const parsed = correctionCommandeClientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }

  try {
    await db.transaction(async (tx) => {
      const [commande] = await tx
        .select()
        .from(commandesClient)
        .where(eq(commandesClient.id, id))
        .limit(1)
        .for("update");
      if (!commande) throw new ErreurMetier("Commande introuvable.");
      if (commande.statut === "ANNULEE") {
        throw new ErreurMetier("Impossible de corriger une commande annulée.");
      }
      if (commande.modeReglement === parsed.data.modeReglement) return;

      await tx
        .update(commandesClient)
        .set({ modeReglement: parsed.data.modeReglement })
        .where(eq(commandesClient.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "modification",
        entite: "commande_client",
        entiteId: id,
        details: {
          champ: "modeReglement",
          ancienneValeur: commande.modeReglement,
          nouvelleValeur: parsed.data.modeReglement,
        },
      });
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

  revalidatePath("/commandes-client");
  revalidatePath(`/commandes-client/${id}`);
  return { error: null, success: true };
}
