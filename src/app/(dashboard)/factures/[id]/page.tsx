import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_FACTURE_CLASS } from "@/lib/statut-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { annulerFacture } from "../actions";

const STATUT_LABEL: Record<string, string> = {
  NON_PAYEE: "Non payée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  SOLDEE: "Soldée",
  ANNULEE: "Annulée",
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageFacture({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  const factureId = Number(id);
  const session = await auth();
  const peutVoirImpayes = can(session, "impayes:read");
  const peutVoirEncaissements = can(session, "encaissements:read");
  const peutAnnuler = can(session, "annulation:effectuer");

  const facture = await db.query.factures.findFirst({
    where: (f, { eq }) => eq(f.id, factureId),
    with: {
      client: true,
      commandeClient: { with: { lignes: true } },
      reglements: true,
    },
  });

  if (!facture) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tabular-nums">{facture.numero}</h1>
            {peutVoirImpayes && (
              <Badge variant="outline" className={STATUT_FACTURE_CLASS[facture.statut]}>
                {STATUT_LABEL[facture.statut]}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/clients/${facture.client.id}`} className="hover:underline">
              {nomAffiche(facture.client)}
            </Link>{" "}
            · <span className="font-mono tabular-nums">{formatDate(facture.dateFacture)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <ApercuDocumentDialog
            href={`/factures/${facture.id}/imprimer`}
            titre={`Facture ${facture.numero}`}
            nomFichier={`facture-${facture.numero}`}
            trigger={<Button variant="outline">Voir la facture</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutAnnuler && facture.statut !== "ANNULEE" && (
            <AnnulationDialog
              action={annulerFacture.bind(null, facture.id)}
              titre="Annuler la facture"
              description="L'annulation est définitive et tracée. Si la facture est déjà réglée, un mouvement de caisse inverse sera généré automatiquement."
            />
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facture.commandeClient.lignes.map((l) => (
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
        <div className="flex flex-wrap justify-end gap-8 border-t bg-muted/50 p-3 text-sm">
          <span className="font-mono tabular-nums">
            Total : <strong>{formatMontant(facture.montantTotal)}</strong>
          </span>
          {peutVoirImpayes && (
            <>
              <span className="font-mono tabular-nums">
                Réglé : <strong>{formatMontant(facture.montantRegle)}</strong>
              </span>
              <span className="font-mono tabular-nums">
                Reste à payer :{" "}
                <strong className={facture.resteAPayer && facture.resteAPayer > 0 ? "text-[#8A211C]" : undefined}>
                  {formatMontant(facture.resteAPayer ?? 0)}
                </strong>
              </span>
            </>
          )}
        </div>
      </div>

      {peutVoirEncaissements && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Règlements</h2>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Moyen</TableHead>
                  <TableHead>Sens</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facture.reglements.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono tabular-nums">{formatDate(r.dateReglement)}</TableCell>
                    <TableCell>{r.moyen}</TableCell>
                    <TableCell>{r.sens === "ENCAISSEMENT" ? "Encaissement" : "Reprise"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatMontant(r.montant)}</TableCell>
                  </TableRow>
                ))}
                {facture.reglements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Aucun règlement.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
