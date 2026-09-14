"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  articles,
  commandesFournisseur,
  fournisseurs,
  lignesCommandeFournisseur,
} from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { ErreurMetier, messageErreurBase } from "@/lib/erreurs-base";
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

  let commandeId: number;
  try {
    commandeId = await db.transaction(async (tx) => {
      // Le serveur revérifie les références : le formulaire propose des
      // listes, mais la requête peut porter n'importe quel identifiant.
      const [fournisseur] = await tx
        .select({ actif: fournisseurs.actif })
        .from(fournisseurs)
        .where(eq(fournisseurs.id, fournisseurId))
        .limit(1);
      if (!fournisseur) throw new ErreurMetier("Fournisseur introuvable.");
      if (!fournisseur.actif) throw new ErreurMetier("Ce fournisseur est désactivé.");

      const idsArticles = [
        ...new Set(lignes.map((l) => l.articleId).filter((id): id is number => id != null)),
      ];
      if (idsArticles.length > 0) {
        const catalogue = await tx
          .select({ id: articles.id, actif: articles.actif, designation: articles.designation })
          .from(articles)
          .where(inArray(articles.id, idsArticles));
        const parId = new Map(catalogue.map((a) => [a.id, a]));
        for (const id of idsArticles) {
          const article = parId.get(id);
          if (!article) throw new ErreurMetier("Un article de la commande n'existe plus.");
          if (!article.actif) {
            throw new ErreurMetier(`L'article « ${article.designation} » est désactivé.`);
          }
        }
      }

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
  } catch (e) {
    if (e instanceof ErreurMetier) return { error: e.message, success: false };
    const message = messageErreurBase(e);
    if (message) return { error: message, success: false };
    throw e;
  }

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

  // Lecture, changement de statut et trace dans une seule transaction, avec
  // verrou sur la ligne : deux clics simultanés ne peuvent plus valider deux
  // fois la même commande, et le journal ne peut plus rester sans écriture.
  await db.transaction(async (tx) => {
    const [commande] = await tx
      .select()
      .from(commandesFournisseur)
      .where(eq(commandesFournisseur.id, id))
      .limit(1)
      .for("update");
    if (!commande) throw new ErreurMetier("Commande introuvable.");
    if (commande.statut !== statutAttendu) {
      throw new ErreurMetier(`Statut actuel invalide pour cette action (${commande.statut}).`);
    }

    await tx
      .update(commandesFournisseur)
      .set({ statut: statutSuivant })
      .where(eq(commandesFournisseur.id, id));

    await tracerActivite(tx, {
      userId: Number(session.user.id),
      action: "validation",
      entite: "commande_fournisseur",
      entiteId: id,
      details: { statut: statutSuivant },
    });
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

  try {
    await db.transaction(async (tx) => {
      const [commande] = await tx
        .select()
        .from(commandesFournisseur)
        .where(eq(commandesFournisseur.id, id))
        .limit(1)
        .for("update");
      if (!commande) throw new ErreurMetier("Commande introuvable.");
      if (commande.statut === "ANNULEE" || commande.statut === "RECUE") {
        throw new ErreurMetier(
          `Une commande ${commande.statut === "RECUE" ? "déjà reçue" : "déjà annulée"} ne peut plus être annulée.`,
        );
      }
      if (commande.montantRegle > 0) {
        throw new ErreurMetier(
          "Cette commande a déjà des paiements enregistrés ; elle ne peut pas être annulée directement.",
        );
      }

      await tx
        .update(commandesFournisseur)
        .set({ statut: "ANNULEE" })
        .where(eq(commandesFournisseur.id, id));

      await tracerActivite(tx, {
        userId: Number(session.user.id),
        action: "annulation",
        entite: "commande_fournisseur",
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

  revalidatePath("/commandes-fournisseur");
  revalidatePath(`/commandes-fournisseur/${id}`);
  return { error: null, success: true };
}
