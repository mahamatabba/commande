import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, fournisseurs } from "@/db/schema";
import { can } from "@/lib/permissions";
import { STATUTS_COMMANDE_FOURNISSEUR, bornerDebut, bornerFin, lireStatut } from "@/lib/filtres";
import { STATUT_COMMANDE_FOURNISSEUR_LABEL, libelle } from "@/lib/libelles";
import { reponseCsv } from "@/lib/export-csv";
import { accesRefuse } from "@/lib/pdf/reponse";

export const runtime = "nodejs";

export async function GET(requete: Request) {
  const session = await auth();
  if (!can(session, "commandes_fournisseur:read")) return accesRefuse();
  const peutVoirDecaissements = can(session, "decaissements:read");

  const p = new URL(requete.url).searchParams;
  const statut = lireStatut(p.get("statut") ?? undefined, STATUTS_COMMANDE_FOURNISSEUR);
  const debut = bornerDebut(p.get("du") ?? undefined);
  const fin = bornerFin(p.get("au") ?? undefined);
  const conditions = [
    statut ? eq(commandesFournisseur.statut, statut) : undefined,
    debut ? gte(commandesFournisseur.dateCommande, debut) : undefined,
    fin ? lte(commandesFournisseur.dateCommande, fin) : undefined,
  ].filter(Boolean);

  const lignes = await db
    .select({
      numero: commandesFournisseur.numero,
      dateCommande: commandesFournisseur.dateCommande,
      montantTotal: commandesFournisseur.montantTotal,
      montantRegle: commandesFournisseur.montantRegle,
      statut: commandesFournisseur.statut,
      fournisseur: fournisseurs.nom,
    })
    .from(commandesFournisseur)
    .innerJoin(fournisseurs, eq(commandesFournisseur.fournisseurId, fournisseurs.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(commandesFournisseur.dateCommande), desc(commandesFournisseur.id));

  return reponseCsv(
    lignes,
    [
      { titre: "Numéro", valeur: (c) => c.numero },
      { titre: "Date", valeur: (c) => c.dateCommande },
      { titre: "Fournisseur", valeur: (c) => c.fournisseur },
      { titre: "Montant", valeur: (c) => c.montantTotal },
      ...(peutVoirDecaissements
        ? [{ titre: "Payé", valeur: (c: (typeof lignes)[number]) => c.montantRegle }]
        : []),
      { titre: "Statut", valeur: (c) => libelle(STATUT_COMMANDE_FOURNISSEUR_LABEL, c.statut) },
    ],
    "bons-de-commande",
  );
}
