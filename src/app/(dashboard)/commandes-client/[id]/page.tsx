import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import {
  MODE_REGLEMENT_LABEL,
  STATUT_COMMANDE_CLIENT_LABEL,
  STATUT_PROFORMA_LABEL,
  libelle,
} from "@/lib/libelles";
import { STATUT_COMMANDE_CLIENT_CLASS } from "@/lib/statut-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { CorrectionModeReglementDialog } from "@/components/commandes/correction-mode-reglement-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { annulerCommandeClient, corrigerCommandeClient, validerCommandeClient } from "../actions";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageCommandeClient({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  const commandeId = Number(id);
  const session = await auth();
  const peutEcrire = can(session, "commandes_client:write");
  const peutAnnuler = can(session, "annulation:effectuer");
  const peutFacturer = can(session, "factures:emettre");
  const peutCorriger = can(session, "commandes_client:corriger");

  const commande = await db.query.commandesClient.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: {
      client: true,
      lignes: true,
      proformas: { orderBy: (p, { desc }) => desc(p.dateProforma) },
    },
  });

  if (!commande) notFound();

  const proformaEnCours = commande.proformas.find((p) => p.statut === "EMISE");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tabular-nums">{commande.numero}</h1>
            <Badge variant="outline" className={STATUT_COMMANDE_CLIENT_CLASS[commande.statut]}>
              {libelle(STATUT_COMMANDE_CLIENT_LABEL, commande.statut)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/clients/${commande.client.id}`} className="hover:underline">
              {nomAffiche(commande.client)}
            </Link>{" "}
            · <span className="font-mono tabular-nums">{formatDate(commande.dateCommande)}</span> ·{" "}
            {libelle(MODE_REGLEMENT_LABEL, commande.modeReglement)}
          </p>
        </div>
        <div className="flex gap-2">
          <ApercuDocumentDialog
            href={`/commandes-client/${commande.id}/imprimer`}
            titre={`Bon de commande ${commande.numero}`}
            nomFichier={`bon-commande-${commande.numero}`}
            trigger={<Button variant="outline">Voir le bon de commande</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutEcrire && commande.statut === "BROUILLON" && (
            <form action={validerCommandeClient.bind(null, commande.id)}>
              <Button type="submit">Valider</Button>
            </form>
          )}
          {peutFacturer && commande.statut === "VALIDEE" && !proformaEnCours && (
            <Button
              variant="outline"
              render={<Link href={`/proformas/nouvelle?commandeClientId=${commande.id}`} />}
            >
              Établir une proforma
            </Button>
          )}
          {peutFacturer && commande.statut === "VALIDEE" && (
            <Button render={<Link href={`/factures/nouvelle?commandeClientId=${commande.id}`} />}>
              Émettre la facture
            </Button>
          )}
          {peutCorriger && commande.statut !== "ANNULEE" && (
            <CorrectionModeReglementDialog
              action={corrigerCommandeClient.bind(null, commande.id)}
              modeReglementActuel={commande.modeReglement}
            />
          )}
          {peutAnnuler && commande.statut !== "ANNULEE" && commande.statut !== "FACTUREE" && (
            <AnnulationDialog
              action={annulerCommandeClient.bind(null, commande.id)}
              titre="Annuler la commande"
            />
          )}
        </div>
      </div>

      {commande.proformas.length > 0 && (
        <div className="rounded-[2px] border border-[#C6D2E0] bg-[#EEF2F7] p-3 text-sm text-[#1E3A5F]">
          <span className="font-medium">Proformas établies :</span>{" "}
          {commande.proformas.map((p, i) => (
            <span key={p.id}>
              {i > 0 && " · "}
              <Link href={`/proformas/${p.id}`} className="font-mono tabular-nums underline">
                {p.numero}
              </Link>{" "}
              ({libelle(STATUT_PROFORMA_LABEL, p.statut).toLowerCase()})
            </span>
          ))}
        </div>
      )}

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
            {commande.lignes.map((l) => (
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
        <div className="flex justify-end border-t bg-muted/50 p-3 text-sm">
          <span className="font-mono tabular-nums">
            Total : <strong>{formatMontant(commande.montantTotal)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
