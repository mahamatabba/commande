import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { MOYEN_REGLEMENT_LABEL, STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { STATUT_FACTURE_BADGE } from "@/lib/statut-style";
import { Badge } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { MarquerPayeeDialog } from "@/components/factures/marquer-payee-dialog";
import { annulerFacture, marquerFacturePayee } from "../actions";

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
  requirePermission(session, "factures:read");
  const peutVoirImpayes = can(session, "impayes:read");
  const peutVoirEncaissements = can(session, "encaissements:read");
  const peutAnnuler = can(session, "annulation:effectuer");
  const peutRegler = can(session, "reglements:saisir");

  const facture = await db.query.factures.findFirst({
    where: (f, { eq }) => eq(f.id, factureId),
    with: {
      client: true,
      commandeClient: { with: { lignes: true } },
      reglements: true,
      // Chiffrage dont cette facture est issue, quand elle vient d'une
      // conversion : sans ce lien, retrouver l'offre acceptée par le client
      // obligerait à fouiller le journal d'activité.
      proformaOrigine: true,
    },
  });

  if (!facture) notFound();

  // `resteAPayer` est une colonne calculée par la base ; la soustraction n'est
  // qu'un filet de sécurité pour le cas où elle ne serait pas remontée.
  const resteAPayer = facture.resteAPayer ?? facture.montantTotal - facture.montantRegle;
  const encaissable = facture.statut !== "ANNULEE" && resteAPayer > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tabular-nums">{facture.numero}</h1>
            {peutVoirImpayes && (
              <Badge {...STATUT_FACTURE_BADGE[facture.statut]}>
                {libelle(STATUT_FACTURE_LABEL, facture.statut)}
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
            href={`/factures/${facture.id}/pdf`}
            titre={`Facture ${facture.numero}`}
            nomFichier={`facture-${facture.numero}`}
            trigger={<Button variant="outline">Voir la facture</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutRegler && encaissable && (
            <MarquerPayeeDialog
              action={marquerFacturePayee.bind(null, facture.id)}
              resteAPayer={resteAPayer}
            />
          )}
          {peutAnnuler && facture.statut !== "ANNULEE" && (
            <AnnulationDialog
              action={annulerFacture.bind(null, facture.id)}
              titre="Annuler la facture"
              description="L'annulation est définitive et tracée. Si la facture est déjà réglée, un mouvement de caisse inverse sera généré automatiquement."
            />
          )}
        </div>
      </div>

      {facture.proformaOrigine && (
        <p className="rounded-[2px] border border-[#C6D2E0] bg-[#EEF2F7] p-3 text-sm text-[#1E3A5F]">
          Établie à partir de la proforma{" "}
          <Link
            href={`/proformas/${facture.proformaOrigine.id}`}
            className="font-mono tabular-nums underline"
          >
            {facture.proformaOrigine.numero}
          </Link>{" "}
          du {formatDate(facture.proformaOrigine.dateProforma)}.
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
        <div className="flex flex-wrap justify-end gap-x-8 gap-y-2 border-t bg-muted/50 p-3 text-sm">
          <span className="font-mono tabular-nums">
            Total HT : <strong>{formatMontant(facture.montantHt)}</strong>
          </span>
          <span className="font-mono tabular-nums">
            {facture.exonereTva ? "TVA exonérée" : `TVA ${formatTaux(facture.tauxTva)}`} :{" "}
            <strong>{formatMontant(facture.montantTva)}</strong>
          </span>
          <span className="font-mono tabular-nums">
            Total TTC : <strong>{formatMontant(facture.montantTotal)}</strong>
          </span>
          {peutVoirImpayes && (
            <>
              <span className="font-mono tabular-nums">
                Réglé : <strong>{formatMontant(facture.montantRegle)}</strong>
              </span>
              <span className="font-mono tabular-nums">
                Reste à payer :{" "}
                <strong className={resteAPayer > 0 ? "text-[#8A211C]" : undefined}>
                  {formatMontant(resteAPayer)}
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
                    <TableCell>{libelle(MOYEN_REGLEMENT_LABEL, r.moyen)}</TableCell>
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
