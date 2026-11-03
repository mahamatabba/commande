import { auth } from "@/auth";
import { db } from "@/db";
import { lireVisuelsSignature } from "@/lib/parametres";
import { can } from "@/lib/permissions";
import { CommandeClientPdf } from "@/lib/pdf/commande-client-pdf";
import {
  accesRefuse,
  introuvable,
  lireId,
  reponsePdf,
  veutTelecharger,
} from "@/lib/pdf/reponse";

export const runtime = "nodejs";

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commandeId = lireId(id);
  if (commandeId === null) return introuvable();

  const session = await auth();
  if (!can(session, "commandes_client:read")) return accesRefuse();

  const commande = await db.query.commandesClient.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: { client: true, lignes: true },
  });
  if (!commande) return introuvable();

  const visuels = await lireVisuelsSignature();

  return reponsePdf(<CommandeClientPdf commande={commande} visuels={visuels} />, {
    nomFichier: `bon-livraison-${commande.numero}`,
    telecharger: veutTelecharger(requete.url),
  });
}
