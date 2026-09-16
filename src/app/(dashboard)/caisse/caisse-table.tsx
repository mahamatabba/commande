"use client";

import { Badge } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { formatDate, formatMontant } from "@/lib/format";
import { SENS_REGLEMENT_LABEL, libelle } from "@/lib/libelles";

const SENS_BADGE: Record<string, { color: string; variant: "light" }> = {
  ENCAISSEMENT: { color: "green", variant: "light" },
  DECAISSEMENT: { color: "red", variant: "light" },
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

type Mouvement = {
  id: number;
  dateMouvement: Date;
  sens: "ENCAISSEMENT" | "DECAISSEMENT";
  montant: number;
  soldeAffiche: number;
  reglement: {
    facture: {
      numero: string;
      client: { nom: string; prenom: string | null; raisonSociale: string | null };
    } | null;
    commandeFournisseur: {
      numero: string;
      fournisseur: { nom: string };
    } | null;
  };
};

export function CaisseTable({ mouvements }: { mouvements: Mouvement[] }) {
  return (
    <DataTable
      records={mouvements}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucun mouvement de caisse."
      columns={[
        {
          accessor: "dateMouvement",
          title: "Date",
          render: (m) => <span className="font-mono tabular-nums">{formatDate(m.dateMouvement)}</span>,
        },
        {
          accessor: "sens",
          title: "Sens",
          render: (m) => (
            <Badge {...SENS_BADGE[m.sens]}>{libelle(SENS_REGLEMENT_LABEL, m.sens)}</Badge>
          ),
        },
        {
          accessor: "origine",
          title: "Origine",
          render: (m) =>
            m.reglement.facture
              ? `Facture ${m.reglement.facture.numero} — ${nomAffiche(m.reglement.facture.client)}`
              : m.reglement.commandeFournisseur
                ? `Achat ${m.reglement.commandeFournisseur.numero} — ${m.reglement.commandeFournisseur.fournisseur.nom}`
                : "—",
        },
        {
          accessor: "montant",
          title: "Montant",
          textAlign: "right",
          render: (m) => <span className="font-mono tabular-nums">{formatMontant(m.montant)}</span>,
        },
        {
          accessor: "soldeAffiche",
          title: "Solde après",
          textAlign: "right",
          render: (m) => (
            <span className="font-mono font-medium tabular-nums">{formatMontant(m.soldeAffiche)}</span>
          ),
        },
      ]}
    />
  );
}
