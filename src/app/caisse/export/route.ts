import { and, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { mouvementsCaisse } from "@/db/schema";
import { can } from "@/lib/permissions";
import { bornerDebut, bornerFin } from "@/lib/filtres";
import { MOYEN_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import { nomTiers, reponseCsv } from "@/lib/export-csv";
import { accesRefuse } from "@/lib/pdf/reponse";

export const runtime = "nodejs";

/** Mouvements de caisse de la période, du plus ancien au plus récent. */
export async function GET(requete: Request) {
  const session = await auth();
  if (!can(session, "caisse:solde:read")) return accesRefuse();

  const p = new URL(requete.url).searchParams;
  const debut = bornerDebut(p.get("du") ?? undefined);
  const fin = bornerFin(p.get("au") ?? undefined);
  const conditions = [
    debut ? gte(mouvementsCaisse.dateMouvement, debut) : undefined,
    fin ? lte(mouvementsCaisse.dateMouvement, fin) : undefined,
  ].filter(Boolean);

  const mouvements = await db.query.mouvementsCaisse.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: {
      reglement: {
        with: {
          facture: { with: { client: true } },
          commandeFournisseur: { with: { fournisseur: true } },
        },
      },
    },
    orderBy: (m, { asc }) => [asc(m.dateMouvement), asc(m.id)],
  });

  return reponseCsv(
    mouvements,
    [
      { titre: "Date", valeur: (m) => m.dateMouvement },
      { titre: "Sens", valeur: (m) => (m.sens === "ENCAISSEMENT" ? "Encaissement" : "Décaissement") },
      {
        titre: "Pièce",
        valeur: (m) => m.reglement.facture?.numero ?? m.reglement.commandeFournisseur?.numero ?? "",
      },
      {
        titre: "Tiers",
        valeur: (m) =>
          m.reglement.facture
            ? nomTiers(m.reglement.facture.client)
            : (m.reglement.commandeFournisseur?.fournisseur.nom ?? ""),
      },
      { titre: "Moyen", valeur: (m) => libelle(MOYEN_REGLEMENT_LABEL, m.reglement.moyen) },
      { titre: "Encaissement", valeur: (m) => (m.sens === "ENCAISSEMENT" ? m.montant : null) },
      { titre: "Décaissement", valeur: (m) => (m.sens === "DECAISSEMENT" ? m.montant : null) },
      { titre: "Commentaire", valeur: (m) => m.reglement.commentaire },
    ],
    "caisse",
  );
}
