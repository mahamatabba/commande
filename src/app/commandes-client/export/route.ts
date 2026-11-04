import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, commandesClient } from "@/db/schema";
import { can } from "@/lib/permissions";
import { STATUTS_COMMANDE_CLIENT, bornerDebut, bornerFin, lireStatut } from "@/lib/filtres";
import { MODE_REGLEMENT_LABEL, STATUT_COMMANDE_CLIENT_LABEL, libelle } from "@/lib/libelles";
import { nomTiers, reponseCsv } from "@/lib/export-csv";
import { accesRefuse } from "@/lib/pdf/reponse";

export const runtime = "nodejs";

export async function GET(requete: Request) {
  const session = await auth();
  if (!can(session, "commandes_client:read")) return accesRefuse();

  const p = new URL(requete.url).searchParams;
  const statut = lireStatut(p.get("statut") ?? undefined, STATUTS_COMMANDE_CLIENT);
  const debut = bornerDebut(p.get("du") ?? undefined);
  const fin = bornerFin(p.get("au") ?? undefined);
  const conditions = [
    statut ? eq(commandesClient.statut, statut) : undefined,
    debut ? gte(commandesClient.dateCommande, debut) : undefined,
    fin ? lte(commandesClient.dateCommande, fin) : undefined,
  ].filter(Boolean);

  const lignes = await db
    .select({
      numero: commandesClient.numero,
      dateCommande: commandesClient.dateCommande,
      modeReglement: commandesClient.modeReglement,
      montantTotal: commandesClient.montantTotal,
      statut: commandesClient.statut,
      nom: clients.nom,
      prenom: clients.prenom,
      raisonSociale: clients.raisonSociale,
    })
    .from(commandesClient)
    .innerJoin(clients, eq(commandesClient.clientId, clients.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(commandesClient.dateCommande), desc(commandesClient.id));

  return reponseCsv(
    lignes,
    [
      { titre: "Numéro", valeur: (c) => c.numero },
      { titre: "Date", valeur: (c) => c.dateCommande },
      { titre: "Client", valeur: (c) => nomTiers(c) },
      { titre: "Règlement", valeur: (c) => libelle(MODE_REGLEMENT_LABEL, c.modeReglement) },
      { titre: "Montant HT", valeur: (c) => c.montantTotal },
      { titre: "Statut", valeur: (c) => libelle(STATUT_COMMANDE_CLIENT_LABEL, c.statut) },
    ],
    "ventes",
  );
}
