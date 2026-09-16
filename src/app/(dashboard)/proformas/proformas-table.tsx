"use client";

import Link from "next/link";
import { ActionIcon, Badge, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { Eye, FileText } from "lucide-react";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import { STATUT_PROFORMA_BADGE } from "@/lib/statut-style";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

type Proforma = {
  id: number;
  numero: string;
  dateProforma: Date;
  dateValidite: Date;
  montantTotal: number;
  statut: "EMISE" | "CONVERTIE" | "ANNULEE";
  clientNom: string;
  clientPrenom: string | null;
  clientRaisonSociale: string | null;
};

export function ProformasTable({ liste }: { liste: Proforma[] }) {
  // Recalculée côté client à l'affichage — la page serveur ne doit pas
  // transmettre un `Date` figé au moment du rendu.
  const aujourdHui = new Date();

  return (
    <DataTable
      records={liste}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucune proforma. Elles s'établissent depuis la fiche d'une vente validée."
      columns={[
        {
          accessor: "numero",
          title: "Numéro",
          render: (p) => (
            <Link href={`/proformas/${p.id}`} className="font-mono font-medium tabular-nums hover:underline">
              {p.numero}
            </Link>
          ),
        },
        {
          accessor: "client",
          title: "Client",
          render: (p) => nomAffiche({ nom: p.clientNom, prenom: p.clientPrenom, raisonSociale: p.clientRaisonSociale }),
        },
        {
          accessor: "dateProforma",
          title: "Date",
          render: (p) => <span className="font-mono tabular-nums">{formatDate(p.dateProforma)}</span>,
        },
        {
          accessor: "dateValidite",
          title: "Valable jusqu'au",
          render: (p) => {
            const expiree = p.statut === "EMISE" && p.dateValidite < aujourdHui;
            return (
              <span className="font-mono tabular-nums">
                <span className={expiree ? "text-[var(--mantine-color-red-5)]" : undefined}>
                  {formatDate(p.dateValidite)}
                </span>
                {expiree && <span className="ml-2 text-xs text-[var(--mantine-color-red-5)]">expirée</span>}
              </span>
            );
          },
        },
        {
          accessor: "statut",
          title: "Statut",
          render: (p) => <Badge {...STATUT_PROFORMA_BADGE[p.statut]}>{libelle(STATUT_PROFORMA_LABEL, p.statut)}</Badge>,
        },
        {
          accessor: "montantTotal",
          title: "Montant TTC",
          textAlign: "right",
          render: (p) => <span className="font-mono tabular-nums">{formatMontant(p.montantTotal)}</span>,
        },
        {
          accessor: "actions",
          title: "",
          textAlign: "right",
          render: (p) => (
            <Group justify="flex-end" gap={4} wrap="nowrap">
              <ActionIcon
                component={Link}
                href={`/proformas/${p.id}`}
                variant="subtle"
                color="gray"
                title="Voir le détail"
                aria-label="Voir le détail"
              >
                <Eye size={16} />
              </ActionIcon>
              <ApercuDocumentDialog
                href={`/proformas/${p.id}/pdf`}
                titre={`Proforma ${p.numero}`}
                nomFichier={`proforma-${p.numero}`}
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
