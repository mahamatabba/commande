"use client";

import Link from "next/link";
import { Badge, Paper, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import {
  STATUT_COMMANDE_CLIENT_BADGE,
  STATUT_FACTURE_BADGE,
  STATUT_PROFORMA_BADGE,
} from "@/lib/statut-style";

const STATUT_COMMANDE_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

const STATUT_FACTURE_LABEL: Record<string, string> = {
  NON_PAYEE: "Non payée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  SOLDEE: "Soldée",
  ANNULEE: "Annulée",
};

type CommandeClient = {
  id: number;
  numero: string;
  dateCommande: Date;
  statut: "BROUILLON" | "VALIDEE" | "FACTUREE" | "ANNULEE";
  modeReglement: "ESPECES" | "BON_DE_COMMANDE";
  montantTotal: number;
};

type Proforma = {
  id: number;
  numero: string;
  dateProforma: Date;
  dateValidite: Date;
  statut: "EMISE" | "CONVERTIE" | "ANNULEE";
  montantTotal: number;
};

type Facture = {
  id: number;
  numero: string;
  dateFacture: Date;
  statut: "NON_PAYEE" | "PARTIELLEMENT_PAYEE" | "SOLDEE" | "ANNULEE";
  montantTotal: number;
  resteAPayer: number | null;
};

export function ClientDetailTables({
  commandes,
  proformasClient,
  facturesClient,
  peutVoirProformas,
  peutVoirSolde,
}: {
  commandes: CommandeClient[];
  proformasClient: Proforma[];
  facturesClient: Facture[];
  peutVoirProformas: boolean;
  peutVoirSolde: boolean;
}) {
  return (
    <>
      <div>
        <Title order={2} size="h4" mb="sm">Ventes</Title>
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
                  <Link href={`/commandes-client/${c.id}`} className="font-mono font-medium tabular-nums hover:underline">
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
                accessor: "modeReglement",
                title: "Mode de règlement",
                render: (c) => (c.modeReglement === "ESPECES" ? "Espèces" : "Bon de commande"),
              },
              {
                accessor: "statut",
                title: "Statut",
                render: (c) => (
                  <Badge {...STATUT_COMMANDE_CLIENT_BADGE[c.statut]}>{STATUT_COMMANDE_LABEL[c.statut]}</Badge>
                ),
              },
              {
                accessor: "montantTotal",
                title: "Montant",
                textAlign: "right",
                render: (c) => <span className="font-mono tabular-nums">{formatMontant(c.montantTotal)}</span>,
              },
            ]}
          />
        </Paper>
      </div>

      {/* Section affichée seulement si le client a reçu au moins un chiffrage :
          la proforma est une étape facultative, un tableau vide sur chaque
          fiche n'apprendrait rien. */}
      {peutVoirProformas && proformasClient.length > 0 && (
        <div>
          <Title order={2} size="h4" mb="sm">Proformas</Title>
          <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
            <DataTable
              records={proformasClient}
              idAccessor="id"
              withTableBorder={false}
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
                  accessor: "dateProforma",
                  title: "Date",
                  render: (p) => <span className="font-mono tabular-nums">{formatDate(p.dateProforma)}</span>,
                },
                {
                  accessor: "dateValidite",
                  title: "Valable jusqu'au",
                  render: (p) => {
                    const expiree = p.statut === "EMISE" && p.dateValidite < new Date();
                    return (
                      <span
                        className={`font-mono tabular-nums${expiree ? " text-[var(--mantine-color-yellow-6)]" : ""}`}
                        title={expiree ? "Offre expirée : le prix annoncé n'engage plus AEI." : undefined}
                      >
                        {formatDate(p.dateValidite)}
                      </span>
                    );
                  },
                },
                {
                  accessor: "statut",
                  title: "Statut",
                  render: (p) => (
                    <Badge {...STATUT_PROFORMA_BADGE[p.statut]}>{libelle(STATUT_PROFORMA_LABEL, p.statut)}</Badge>
                  ),
                },
                {
                  accessor: "montantTotal",
                  title: "Montant",
                  textAlign: "right",
                  render: (p) => <span className="font-mono tabular-nums">{formatMontant(p.montantTotal)}</span>,
                },
              ]}
            />
          </Paper>
        </div>
      )}

      <div>
        <Title order={2} size="h4" mb="sm">Factures</Title>
        <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
          <DataTable
            records={facturesClient}
            idAccessor="id"
            withTableBorder={false}
            noRecordsText="Aucune facture."
            columns={[
              {
                accessor: "numero",
                title: "Numéro",
                render: (f) => (
                  <Link href={`/factures/${f.id}`} className="font-mono font-medium tabular-nums hover:underline">
                    {f.numero}
                  </Link>
                ),
              },
              {
                accessor: "dateFacture",
                title: "Date",
                render: (f) => <span className="font-mono tabular-nums">{formatDate(f.dateFacture)}</span>,
              },
              ...(peutVoirSolde
                ? [
                    {
                      accessor: "statut",
                      title: "Statut",
                      render: (f: Facture) => (
                        <Badge {...STATUT_FACTURE_BADGE[f.statut]}>{STATUT_FACTURE_LABEL[f.statut]}</Badge>
                      ),
                    },
                  ]
                : []),
              {
                accessor: "montantTotal",
                title: "Montant",
                textAlign: "right",
                render: (f) => <span className="font-mono tabular-nums">{formatMontant(f.montantTotal)}</span>,
              },
              ...(peutVoirSolde
                ? [
                    {
                      accessor: "resteAPayer",
                      title: "Reste à payer",
                      textAlign: "right" as const,
                      render: (f: Facture) => (
                        <span className="font-mono tabular-nums">{formatMontant(f.resteAPayer ?? 0)}</span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Paper>
      </div>
    </>
  );
}
