import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import { STATUT_PROFORMA_CLASS } from "@/lib/statut-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { ConversionProformaDialog } from "@/components/proformas/conversion-dialog";
import { annulerProforma, convertirProformaEnFacture } from "../actions";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageProforma({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  const proformaId = Number(id);
  const session = await auth();
  requirePermission(session, "factures:read");
  const peutConvertir = can(session, "factures:emettre");
  const peutAnnuler = can(session, "annulation:effectuer");

  const proforma = await db.query.proformas.findFirst({
    where: (p, { eq }) => eq(p.id, proformaId),
    with: {
      client: true,
      commandeClient: { with: { lignes: true } },
      facture: true,
    },
  });

  if (!proforma) notFound();

  const expiree = proforma.statut === "EMISE" && proforma.dateValidite < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tabular-nums">{proforma.numero}</h1>
            <Badge variant="outline" className={STATUT_PROFORMA_CLASS[proforma.statut]}>
              {libelle(STATUT_PROFORMA_LABEL, proforma.statut)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/clients/${proforma.client.id}`} className="hover:underline">
              {nomAffiche(proforma.client)}
            </Link>{" "}
            · <span className="font-mono tabular-nums">{formatDate(proforma.dateProforma)}</span> ·
            vente{" "}
            <Link
              href={`/commandes-client/${proforma.commandeClient.id}`}
              className="font-mono tabular-nums hover:underline"
            >
              {proforma.commandeClient.numero}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <ApercuDocumentDialog
            href={`/proformas/${proforma.id}/imprimer`}
            titre={`Proforma ${proforma.numero}`}
            nomFichier={`proforma-${proforma.numero}`}
            trigger={<Button variant="outline">Voir la proforma</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutConvertir && proforma.statut === "EMISE" && (
            <ConversionProformaDialog
              action={convertirProformaEnFacture.bind(null, proforma.id)}
              montantTotal={proforma.montantTotal}
              auComptant={proforma.commandeClient.modeReglement === "ESPECES"}
            />
          )}
          {peutAnnuler && proforma.statut === "EMISE" && (
            <AnnulationDialog
              action={annulerProforma.bind(null, proforma.id)}
              titre="Annuler la proforma"
              description="Aucune écriture comptable n'est reprise : une proforma n'en a généré aucune. L'annulation libère la vente pour un nouveau chiffrage."
            />
          )}
        </div>
      </div>

      {proforma.statut === "CONVERTIE" && proforma.facture && (
        <p className="rounded-[2px] border border-[#BEDACD] bg-[#E7F0EB] p-3 text-sm text-[#14563E]">
          Convertie en facture{" "}
          <Link href={`/factures/${proforma.facture.id}`} className="font-mono tabular-nums underline">
            {proforma.facture.numero}
          </Link>{" "}
          le {formatDate(proforma.facture.dateFacture)}.
        </p>
      )}

      {expiree && (
        <p className="rounded-[2px] border border-[#EBD3A8] bg-[#FBF1E0] p-3 text-sm text-[#8A5300]">
          Cette offre a expiré le {formatDate(proforma.dateValidite)}. Le prix annoncé n&apos;engage
          plus AEI : vérifiez-le avant de convertir, ou annulez cette proforma et établissez-en une
          nouvelle.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">P.U. HT</TableHead>
              <TableHead className="text-right">Montant HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proforma.commandeClient.lignes.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.designation}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{l.quantite}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatMontant(l.prixUnitaire)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatMontant(l.montantLigne)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-wrap justify-end gap-x-8 gap-y-2 border-t bg-muted/50 p-3 text-sm">
          <span className="font-mono tabular-nums">
            Total HT : <strong>{formatMontant(proforma.montantHt)}</strong>
          </span>
          <span className="font-mono tabular-nums">
            {proforma.exonereTva ? "TVA exonérée" : `TVA ${formatTaux(proforma.tauxTva)}`} :{" "}
            <strong>{formatMontant(proforma.montantTva)}</strong>
          </span>
          <span className="font-mono tabular-nums">
            Total TTC : <strong>{formatMontant(proforma.montantTotal)}</strong>
          </span>
          <span className="font-mono tabular-nums">
            Valable jusqu&apos;au : <strong>{formatDate(proforma.dateValidite)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
