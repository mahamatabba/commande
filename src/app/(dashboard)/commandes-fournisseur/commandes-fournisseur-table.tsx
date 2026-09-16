"use client";

import Link from "next/link";
import { ActionIcon, Badge, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { Eye, FileText } from "lucide-react";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_COMMANDE_FOURNISSEUR_LABEL, libelle } from "@/lib/libelles";
import { STATUT_COMMANDE_FOURNISSEUR_BADGE } from "@/lib/statut-style";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";

type CommandeFournisseur = {
  id: number;
  numero: string;
  dateCommande: Date;
  statut: "BROUILLON" | "VALIDEE" | "RECUE" | "ANNULEE";
  montantTotal: number;
  montantRegle: number | null;
  fournisseurNom: string;
};

export function CommandesFournisseurTable({
  commandes,
  peutVoirDecaissements,
}: {
  commandes: CommandeFournisseur[];
  peutVoirDecaissements: boolean;
}) {
  return (
    <DataTable
      records={commandes}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucune commande."
      columns={[
        {
          accessor: "numero",
          title: "Numéro",
          render: (c) => (
            <Link href={`/commandes-fournisseur/${c.id}`} className="font-mono font-medium tabular-nums hover:underline">
              {c.numero}
            </Link>
          ),
        },
        { accessor: "fournisseurNom", title: "Fournisseur" },
        {
          accessor: "dateCommande",
          title: "Date",
          render: (c) => <span className="font-mono tabular-nums">{formatDate(c.dateCommande)}</span>,
        },
        {
          accessor: "statut",
          title: "Statut",
          render: (c) => (
            <Badge {...STATUT_COMMANDE_FOURNISSEUR_BADGE[c.statut]}>
              {libelle(STATUT_COMMANDE_FOURNISSEUR_LABEL, c.statut)}
            </Badge>
          ),
        },
        {
          accessor: "montantTotal",
          title: "Montant",
          textAlign: "right",
          render: (c) => <span className="font-mono tabular-nums">{formatMontant(c.montantTotal)}</span>,
        },
        ...(peutVoirDecaissements
          ? [
              {
                accessor: "montantRegle",
                title: "Réglé",
                textAlign: "right" as const,
                render: (c: CommandeFournisseur) => (
                  <span className="font-mono tabular-nums">{formatMontant(c.montantRegle!)}</span>
                ),
              },
            ]
          : []),
        {
          accessor: "actions",
          title: "",
          textAlign: "right",
          render: (c) => (
            <Group justify="flex-end" gap={4} wrap="nowrap">
              <ActionIcon
                component={Link}
                href={`/commandes-fournisseur/${c.id}`}
                variant="subtle"
                color="gray"
                title="Voir le détail"
                aria-label="Voir le détail"
              >
                <Eye size={16} />
              </ActionIcon>
              <ApercuDocumentDialog
                href={`/commandes-fournisseur/${c.id}/pdf`}
                titre={`Bon de commande ${c.numero}`}
                nomFichier={`bon-commande-${c.numero}`}
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
