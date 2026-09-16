"use client";

import { DataTable } from "mantine-datatable";
import { formatDate, formatMontant } from "@/lib/format";
import { MOYEN_REGLEMENT_LABEL, SENS_REGLEMENT_LABEL, libelle } from "@/lib/libelles";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

type Reglement = {
  id: number;
  sens: "ENCAISSEMENT" | "DECAISSEMENT";
  montant: number;
  dateReglement: Date;
  moyen: "ESPECES" | "VIREMENT" | "MOBILE_MONEY";
  facture: {
    numero: string;
    client: { nom: string; prenom: string | null; raisonSociale: string | null };
  } | null;
  commandeFournisseur: {
    numero: string;
    fournisseur: { nom: string };
  } | null;
};

export function ReglementsTable({ historique }: { historique: Reglement[] }) {
  return (
    <DataTable
      records={historique}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucun règlement enregistré."
      columns={[
        {
          accessor: "dateReglement",
          title: "Date",
          render: (r) => <span className="font-mono tabular-nums">{formatDate(r.dateReglement)}</span>,
        },
        { accessor: "sens", title: "Sens", render: (r) => libelle(SENS_REGLEMENT_LABEL, r.sens) },
        {
          accessor: "cible",
          title: "Cible",
          render: (r) =>
            r.facture
              ? `Facture ${r.facture.numero} — ${nomAffiche(r.facture.client)}`
              : r.commandeFournisseur
                ? `Achat ${r.commandeFournisseur.numero} — ${r.commandeFournisseur.fournisseur.nom}`
                : "—",
        },
        { accessor: "moyen", title: "Moyen", render: (r) => libelle(MOYEN_REGLEMENT_LABEL, r.moyen) },
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
