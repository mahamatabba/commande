"use client";

import Link from "next/link";
import { ActionIcon, Badge, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { Eye, FileText } from "lucide-react";
import { formatDate, formatMontant } from "@/lib/format";
import { MODE_REGLEMENT_LABEL, STATUT_COMMANDE_CLIENT_LABEL, libelle } from "@/lib/libelles";
import { STATUT_COMMANDE_CLIENT_BADGE } from "@/lib/statut-style";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

type CommandeClient = {
  id: number;
  numero: string;
  dateCommande: Date;
  statut: "BROUILLON" | "VALIDEE" | "FACTUREE" | "ANNULEE";
  modeReglement: "ESPECES" | "BON_DE_COMMANDE";
  montantTotal: number;
  clientNom: string;
  clientPrenom: string | null;
  clientRaisonSociale: string | null;
};

export function CommandesClientTable({ commandes }: { commandes: CommandeClient[] }) {
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
            <Link href={`/commandes-client/${c.id}`} className="font-mono font-medium tabular-nums hover:underline">
              {c.numero}
            </Link>
          ),
        },
        {
          accessor: "client",
          title: "Client",
          render: (c) => nomAffiche({ nom: c.clientNom, prenom: c.clientPrenom, raisonSociale: c.clientRaisonSociale }),
        },
        {
          accessor: "dateCommande",
          title: "Date",
          render: (c) => <span className="font-mono tabular-nums">{formatDate(c.dateCommande)}</span>,
        },
        {
          accessor: "modeReglement",
          title: "Mode",
          render: (c) => libelle(MODE_REGLEMENT_LABEL, c.modeReglement),
        },
        {
          accessor: "statut",
          title: "Statut",
          render: (c) => (
            <Badge {...STATUT_COMMANDE_CLIENT_BADGE[c.statut]}>
              {libelle(STATUT_COMMANDE_CLIENT_LABEL, c.statut)}
            </Badge>
          ),
        },
        {
          accessor: "montantTotal",
          title: "Montant",
          textAlign: "right",
          render: (c) => <span className="font-mono tabular-nums">{formatMontant(c.montantTotal)}</span>,
        },
        {
          accessor: "actions",
          title: "",
          textAlign: "right",
          render: (c) => (
            <Group justify="flex-end" gap={4} wrap="nowrap">
              <ActionIcon
                component={Link}
                href={`/commandes-client/${c.id}`}
                variant="subtle"
                color="gray"
                title="Voir le détail"
                aria-label="Voir le détail"
              >
                <Eye size={16} />
              </ActionIcon>
              <ApercuDocumentDialog
                href={`/commandes-client/${c.id}/pdf`}
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
