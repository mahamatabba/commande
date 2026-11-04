"use client";

import Link from "next/link";
import { ActionIcon, Badge, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { useTriUrl } from "@/components/shared/use-tri-url";
import { Eye, FileText } from "lucide-react";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { STATUT_FACTURE_BADGE } from "@/lib/statut-style";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

type Facture = {
  id: number;
  numero: string;
  dateFacture: Date;
  montantTotal: number;
  // `string | null` et non l'énumération exacte : côté serveur, cette colonne
  // vient d'une projection conditionnelle (`peutVoirImpayes ? ... : sql\`NULL\``)
  // qui perd le type littéral de l'enum Postgres.
  statut: string | null;
  resteAPayer: number | null;
  clientNom: string;
  clientPrenom: string | null;
  clientRaisonSociale: string | null;
};

export function FacturesTable({ liste, peutVoirImpayes, tri }: { liste: Facture[]; peutVoirImpayes: boolean; tri: { colonne: string; ordre: "asc" | "desc" } }) {
  const { sortStatus, onSortStatusChange } = useTriUrl<Facture>(tri);
  return (
    <DataTable
      records={liste}
      idAccessor="id"
      withTableBorder={false}
      highlightOnHover
      sortStatus={sortStatus}
      onSortStatusChange={onSortStatusChange}
      minHeight={liste.length === 0 ? 160 : undefined}
      noRecordsText="Aucune facture."
      columns={[
        {
          accessor: "numero",
          sortable: true,
          title: "Numéro",
          render: (f) => (
            <Link href={`/factures/${f.id}`} className="font-mono font-medium tabular-nums hover:underline">
              {f.numero}
            </Link>
          ),
        },
        {
          accessor: "client",
          sortable: true,
          title: "Client",
          render: (f) => nomAffiche({ nom: f.clientNom, prenom: f.clientPrenom, raisonSociale: f.clientRaisonSociale }),
        },
        {
          accessor: "dateFacture",
          sortable: true,
          title: "Date",
          render: (f) => <span className="font-mono tabular-nums">{formatDate(f.dateFacture)}</span>,
        },
        ...(peutVoirImpayes
          ? [
              {
                accessor: "statut",
          sortable: true,
                title: "Statut",
                render: (f: Facture) => (
                  <Badge {...STATUT_FACTURE_BADGE[f.statut!]}>{libelle(STATUT_FACTURE_LABEL, f.statut)}</Badge>
                ),
              },
            ]
          : []),
        {
          accessor: "montantTotal",
          sortable: true,
          title: "Montant",
          textAlign: "right",
          render: (f) => <span className="font-mono tabular-nums">{formatMontant(f.montantTotal)}</span>,
        },
        ...(peutVoirImpayes
          ? [
              {
                accessor: "resteAPayer",
          sortable: true,
                title: "Reste à payer",
                textAlign: "right" as const,
                render: (f: Facture) => (
                  <span className="font-mono tabular-nums">{formatMontant(f.resteAPayer!)}</span>
                ),
              },
            ]
          : []),
        {
          accessor: "actions",
          title: "",
          textAlign: "right",
          render: (f) => (
            <Group justify="flex-end" gap={4} wrap="nowrap">
              <ActionIcon
                component={Link}
                href={`/factures/${f.id}`}
                variant="subtle"
                color="gray"
                title="Voir le détail"
                aria-label="Voir le détail"
              >
                <Eye size={16} />
              </ActionIcon>
              <ApercuDocumentDialog
                href={`/factures/${f.id}/pdf`}
                titre={`Facture ${f.numero}`}
                nomFichier={`facture-${f.numero}`}
                trigger={
                  <ActionIcon variant="subtle" color="gray" title="Aperçu PDF" aria-label="Aperçu PDF">
                    <FileText size={16} />
                  </ActionIcon>
                }
              />
            </Group>
          ),
        },
      ]}
    />
  );
}
