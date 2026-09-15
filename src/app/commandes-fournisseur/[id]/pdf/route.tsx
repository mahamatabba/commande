import { auth } from "@/auth";
import { db } from "@/db";
import { can } from "@/lib/permissions";
import { CommandeFournisseurPdf } from "@/lib/pdf/commande-fournisseur-pdf";
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
  if (!can(session, "commandes_fournisseur:read")) return accesRefuse();

  const commande = await db.query.commandesFournisseur.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: { fournisseur: true, lignes: true },
  });
  if (!commande) return introuvable();

  return reponsePdf(<CommandeFournisseurPdf commande={commande} />, {
    nomFichier: `bon-commande-${commande.numero}`,
    telecharger: veutTelecharger(requete.url),
  });
}
