import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { formatDateHeure } from "@/lib/format";
import { Badge, Group, Paper, Stack, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { UtilisateurCreationDialog } from "@/components/utilisateurs/utilisateur-creation-dialog";
import { UtilisateurEditDialog } from "@/components/utilisateurs/utilisateur-edit-dialog";
import { ReinitialiserMotDePasseDialog } from "@/components/utilisateurs/reinitialiser-mot-de-passe-dialog";

const LABEL_ROLE: Record<string, string> = {
  AGENT: "Agent",
  SUPERVISEUR: "Superviseur",
  ADMIN: "Administrateur",
};

export default async function PageUtilisateurs() {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");

  const liste = await db.select().from(users).orderBy(users.nomComplet);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Utilisateurs</Title>
        <UtilisateurCreationDialog />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
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
                  {u.id === Number(session!.user.id) && (
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
      </Paper>
    </Stack>
  );
}
