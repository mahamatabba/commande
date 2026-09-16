"use client";

import Link from "next/link";
import { Badge, Paper, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_COMMANDE_FOURNISSEUR_BADGE } from "@/lib/statut-style";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

type CommandeFournisseur = {
  id: number;
  numero: string;
  dateCommande: Date;
  statut: "BROUILLON" | "VALIDEE" | "RECUE" | "ANNULEE";
  montantTotal: number;
  montantRegle: number;
};

type Paiement = {
  id: number;
  dateReglement: Date;
  moyen: "ESPECES" | "VIREMENT" | "MOBILE_MONEY";
  montant: number;
};

export function FournisseurDetailTables({
  commandes,
  paiementsFournisseur,
  peutVoirDecaissements,
}: {
  commandes: CommandeFournisseur[];
  paiementsFournisseur: Paiement[];
  peutVoirDecaissements: boolean;
}) {
  return (
    <>
      <div>
        <Title order={2} size="h4" mb="sm">Achats</Title>
        <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
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
              {
                accessor: "dateCommande",
                title: "Date",
                render: (c) => <span className="font-mono tabular-nums">{formatDate(c.dateCommande)}</span>,
              },
              {
                accessor: "statut",
                title: "Statut",
                render: (c) => (
                  <Badge {...STATUT_COMMANDE_FOURNISSEUR_BADGE[c.statut]}>{STATUT_LABEL[c.statut]}</Badge>
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
                        <span className="font-mono tabular-nums">{formatMontant(c.montantRegle)}</span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Paper>
      </div>

      {peutVoirDecaissements && (
        <div>
          <Title order={2} size="h4" mb="sm">Paiements (décaissements)</Title>
          <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
            <DataTable
              records={paiementsFournisseur}
              idAccessor="id"
              withTableBorder={false}
              noRecordsText="Aucun paiement."
              columns={[
                {
                  accessor: "dateReglement",
                  title: "Date",
                  render: (p) => <span className="font-mono tabular-nums">{formatDate(p.dateReglement)}</span>,
                },
                { accessor: "moyen", title: "Moyen" },
                {
                  accessor: "montant",
                  title: "Montant",
                  textAlign: "right",
                  render: (p) => <span className="font-mono tabular-nums">{formatMontant(p.montant)}</span>,
                },
              ]}
            />
          </Paper>
        </div>
      )}
    </>
  );
}
