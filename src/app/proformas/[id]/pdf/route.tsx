import { auth } from "@/auth";
import { db } from "@/db";
import { can } from "@/lib/permissions";
import { ProformaPdf } from "@/lib/pdf/proforma-pdf";
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
  const proformaId = lireId(id);
  if (proformaId === null) return introuvable();

  const session = await auth();
  if (!can(session, "factures:read")) return accesRefuse();

  const proforma = await db.query.proformas.findFirst({
    where: (p, { eq }) => eq(p.id, proformaId),
    with: { client: true, commandeClient: { with: { lignes: true } } },
  });
  if (!proforma) return introuvable();

  return reponsePdf(<ProformaPdf proforma={proforma} />, {
    nomFichier: `proforma-${proforma.numero}`,
    telecharger: veutTelecharger(requete.url),
  });
}
