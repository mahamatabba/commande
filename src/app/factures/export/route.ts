import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, factures } from "@/db/schema";
import { can } from "@/lib/permissions";
import { STATUTS_FACTURE, bornerDebut, bornerFin, lireStatut } from "@/lib/filtres";
import { STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { nomTiers, reponseCsv } from "@/lib/export-csv";
import { accesRefuse } from "@/lib/pdf/reponse";

export const runtime = "nodejs";

/** Export des factures, avec les filtres de la liste (statut, période). */
export async function GET(requete: Request) {
  const session = await auth();
  if (!can(session, "factures:read")) return accesRefuse();
  const peutVoirImpayes = can(session, "impayes:read");

  const p = new URL(requete.url).searchParams;
  const statut = peutVoirImpayes ? lireStatut(p.get("statut") ?? undefined, STATUTS_FACTURE) : undefined;
  const debut = bornerDebut(p.get("du") ?? undefined);
  const fin = bornerFin(p.get("au") ?? undefined);
  const conditions = [
    statut ? eq(factures.statut, statut) : undefined,
    debut ? gte(factures.dateFacture, debut) : undefined,
    fin ? lte(factures.dateFacture, fin) : undefined,
  ].filter(Boolean);

  const lignes = await db
    .select({
      numero: factures.numero,
      dateFacture: factures.dateFacture,
      montantHt: factures.montantHt,
      tauxTva: factures.tauxTva,
      montantTva: factures.montantTva,
      montantTotal: factures.montantTotal,
      montantRegle: factures.montantRegle,
      resteAPayer: factures.resteAPayer,
      statut: factures.statut,
      nom: clients.nom,
      prenom: clients.prenom,
      raisonSociale: clients.raisonSociale,
      nif: factures.nifClient,
    })
    .from(factures)
    .innerJoin(clients, eq(factures.clientId, clients.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(factures.dateFacture), desc(factures.id));

  return reponseCsv(
    lignes,
    [
      { titre: "Numéro", valeur: (f) => f.numero },
      { titre: "Date", valeur: (f) => f.dateFacture },
      { titre: "Client", valeur: (f) => nomTiers(f) },
      { titre: "NIF client", valeur: (f) => f.nif },
      { titre: "Total HT", valeur: (f) => f.montantHt },
      { titre: "Taux TVA (%)", valeur: (f) => f.tauxTva },
      { titre: "TVA", valeur: (f) => f.montantTva },
      { titre: "Total TTC", valeur: (f) => f.montantTotal },
      ...(peutVoirImpayes
        ? [
            { titre: "Réglé", valeur: (f: (typeof lignes)[number]) => f.montantRegle },
            { titre: "Reste à payer", valeur: (f: (typeof lignes)[number]) => f.resteAPayer },
            { titre: "Statut", valeur: (f: (typeof lignes)[number]) => libelle(STATUT_FACTURE_LABEL, f.statut) },
          ]
        : []),
    ],
    "factures",
  );
}
