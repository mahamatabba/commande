"use client";

import { DataTable } from "mantine-datatable";
import { formatDate, formatMontant } from "@/lib/format";
import { MOYEN_REGLEMENT_LABEL, libelle } from "@/lib/libelles";

type Reglement = {
  id: number;
  dateReglement: Date;
  moyen: "ESPECES" | "VIREMENT" | "MOBILE_MONEY";
  sens: "ENCAISSEMENT" | "DECAISSEMENT";
  montant: number;
};

export function ReglementsFactureTable({ reglements }: { reglements: Reglement[] }) {
  return (
    <DataTable
      records={reglements}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucun règlement."
      columns={[
        {
          accessor: "dateReglement",
          title: "Date",
          render: (r) => <span className="font-mono tabular-nums">{formatDate(r.dateReglement)}</span>,
        },
        {
          accessor: "moyen",
          title: "Moyen",
          render: (r) => libelle(MOYEN_REGLEMENT_LABEL, r.moyen),
        },
        {
          accessor: "sens",
          title: "Sens",
          render: (r) => (r.sens === "ENCAISSEMENT" ? "Encaissement" : "Reprise"),
        },
        {
          accessor: "montant",
          title: "Montant",
          textAlign: "right",
          render: (r) => <span className="font-mono tabular-nums">{formatMontant(r.montant)}</span>,
        },
      ]}
    />
  );
}
