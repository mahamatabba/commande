"use client";

import { DataTable } from "mantine-datatable";
import { formatDateHeure } from "@/lib/format";
import { formaterDetailsJournal } from "@/lib/journal-format";

const LABEL_ACTION: Record<string, string> = {
  creation: "Création",
  modification: "Modification",
  validation: "Validation",
  annulation: "Annulation",
  reglement: "Règlement",
  conversion: "Conversion",
  connexion: "Connexion",
};

const LABEL_ENTITE: Record<string, string> = {
  commande_fournisseur: "Achat",
  commande_client: "Vente",
  facture: "Facture",
  proforma: "Proforma",
  reglement: "Règlement",
  fournisseur: "Fournisseur",
  client: "Client",
  article: "Article",
  utilisateur: "Utilisateur",
};

type EntreeJournal = {
  id: number;
  createdAt: Date;
  action: string;
  entite: string;
  entiteId: number | null;
  details: unknown;
  user: { nomComplet: string } | null;
};

export function JournalTable({ entrees }: { entrees: EntreeJournal[] }) {
  return (
    <DataTable
      records={entrees}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucune activité enregistrée."
      columns={[
        {
          accessor: "createdAt",
          title: "Date",
          render: (e) => <span className="font-mono tabular-nums whitespace-nowrap">{formatDateHeure(e.createdAt)}</span>,
        },
        { accessor: "user", title: "Utilisateur", render: (e) => e.user?.nomComplet ?? "—" },
        { accessor: "action", title: "Action", render: (e) => LABEL_ACTION[e.action] ?? e.action },
        {
          accessor: "entite",
          title: "Entité",
          render: (e) => (e.action === "connexion" ? "—" : (LABEL_ENTITE[e.entite] ?? e.entite)),
        },
        {
          accessor: "entiteId",
          title: "ID",
          render: (e) => (
            <span className="font-mono tabular-nums">{e.action === "connexion" ? "—" : (e.entiteId ?? "—")}</span>
          ),
        },
        {
          accessor: "details",
          title: "Détails",
          render: (e) => (
            <span
              className="block max-w-sm truncate text-xs text-[var(--mantine-color-dimmed)]"
              title={e.details ? formaterDetailsJournal(e.entite, e.details) : undefined}
            >
              {e.details ? formaterDetailsJournal(e.entite, e.details) : "—"}
            </span>
          ),
        },
      ]}
    />
  );
}
