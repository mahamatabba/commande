import { auth } from "@/auth";
import { db } from "@/db";
import { can } from "@/lib/permissions";
import { FacturePdf } from "@/lib/pdf/facture-pdf";
import {
  accesRefuse,
  introuvable,
  lireId,
  reponsePdf,
  veutTelecharger,
} from "@/lib/pdf/reponse";

// Le rendu PDF s'appuie sur des API Node : la route ne peut pas tourner sur
// l'exécution Edge.
export const runtime = "nodejs";

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factureId = lireId(id);
  if (factureId === null) return introuvable();

  const session = await auth();
  if (!can(session, "factures:read")) return accesRefuse();

  const facture = await db.query.factures.findFirst({
    where: (f, { eq }) => eq(f.id, factureId),
    with: { client: true, commandeClient: { with: { lignes: true } } },
  });
  if (!facture) return introuvable();

  return reponsePdf(<FacturePdf facture={facture} />, {
    nomFichier: `facture-${facture.numero}`,
    telecharger: veutTelecharger(requete.url),
  });
}
