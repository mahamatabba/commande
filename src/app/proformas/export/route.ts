import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, proformas } from "@/db/schema";
import { can } from "@/lib/permissions";
import { STATUTS_PROFORMA, bornerDebut, bornerFin, lireStatut } from "@/lib/filtres";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import { nomTiers, reponseCsv } from "@/lib/export-csv";
import { accesRefuse } from "@/lib/pdf/reponse";

export const runtime = "nodejs";

export async function GET(requete: Request) {
  const session = await auth();
  if (!can(session, "factures:read")) return accesRefuse();

  const p = new URL(requete.url).searchParams;
  const statut = lireStatut(p.get("statut") ?? undefined, STATUTS_PROFORMA);
  const debut = bornerDebut(p.get("du") ?? undefined);
  const fin = bornerFin(p.get("au") ?? undefined);
  const conditions = [
    statut ? eq(proformas.statut, statut) : undefined,
    debut ? gte(proformas.dateProforma, debut) : undefined,
    fin ? lte(proformas.dateProforma, fin) : undefined,
  ].filter(Boolean);

  const lignes = await db
    .select({
      numero: proformas.numero,
      dateProforma: proformas.dateProforma,
      dateValidite: proformas.dateValidite,
      montantHt: proformas.montantHt,
      montantTva: proformas.montantTva,
      montantTotal: proformas.montantTotal,
      delaiLivraison: proformas.delaiLivraison,
      garantie: proformas.garantie,
      statut: proformas.statut,
      nom: clients.nom,
      prenom: clients.prenom,
      raisonSociale: clients.raisonSociale,
    })
    .from(proformas)
    .innerJoin(clients, eq(proformas.clientId, clients.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(proformas.dateProforma), desc(proformas.id));

  return reponseCsv(
    lignes,
    [
      { titre: "Numéro", valeur: (f) => f.numero },
      { titre: "Date", valeur: (f) => f.dateProforma },
      { titre: "Valable jusqu'au", valeur: (f) => f.dateValidite },
      { titre: "Client", valeur: (f) => nomTiers(f) },
      { titre: "Total HT", valeur: (f) => f.montantHt },
      { titre: "TVA", valeur: (f) => f.montantTva },
      { titre: "Total TTC", valeur: (f) => f.montantTotal },
      { titre: "Délai de livraison", valeur: (f) => f.delaiLivraison },
      { titre: "Garantie", valeur: (f) => f.garantie },
      { titre: "Statut", valeur: (f) => libelle(STATUT_PROFORMA_LABEL, f.statut) },
    ],
    "proformas",
  );
}
