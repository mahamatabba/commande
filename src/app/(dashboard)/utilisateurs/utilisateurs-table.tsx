"use client";

import { Badge, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { formatDateHeure } from "@/lib/format";
import { UtilisateurEditDialog } from "@/components/utilisateurs/utilisateur-edit-dialog";
import { ReinitialiserMotDePasseDialog } from "@/components/utilisateurs/reinitialiser-mot-de-passe-dialog";

const LABEL_ROLE: Record<string, string> = {
  AGENT: "Agent",
  SUPERVISEUR: "Superviseur",
  ADMIN: "Administrateur",
};

type Utilisateur = {
  id: number;
  nomComplet: string;
  email: string;
  role: "AGENT" | "SUPERVISEUR" | "ADMIN";
  actif: boolean;
  createdAt: Date;
};

export function UtilisateursTable({
  liste,
  currentUserId,
}: {
  liste: Utilisateur[];
  currentUserId: number;
}) {
  return (
    <DataTable
      records={liste}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucun utilisateur."
      columns={[
        {
          accessor: "nomComplet",
          title: "Nom",
          render: (u) => (
            <span className="font-medium">
              {u.nomComplet}
              {u.id === currentUserId && (
                <span className="ml-2 text-xs text-[var(--mantine-color-dimmed)]">(vous)</span>
              )}
            </span>
          ),
        },
        { accessor: "email", title: "Email" },
        { accessor: "role", title: "Rôle", render: (u) => LABEL_ROLE[u.role] ?? u.role },
        {
          accessor: "actif",
          title: "Statut",
          render: (u) => (
            <Badge color={u.actif ? "green" : "gray"} variant="light">
              {u.actif ? "Actif" : "Inactif"}
            </Badge>
          ),
        },
        {
          accessor: "createdAt",
          title: "Créé le",
          render: (u) => <span className="font-mono tabular-nums">{formatDateHeure(u.createdAt)}</span>,
        },
        {
          accessor: "actions",
          title: "Actions",
          textAlign: "right",
          render: (u) => (
            <Group justify="flex-end" gap="xs">
              <UtilisateurEditDialog utilisateur={u} />
              <ReinitialiserMotDePasseDialog id={u.id} nom={u.nomComplet} />
            </Group>
          ),
        },
      ]}
    />
  );
}
