import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { Group, Paper, Stack, Title } from "@mantine/core";
import { UtilisateurCreationDialog } from "@/components/utilisateurs/utilisateur-creation-dialog";
import { UtilisateursTable } from "./utilisateurs-table";

export default async function PageUtilisateurs() {
  const session = await auth();
  requirePermission(session, "utilisateurs:gerer");

  // Sélection explicite des colonnes : `passwordHash` ne doit jamais quitter
  // le serveur, ni transiter par les props d'un composant client.
  const liste = await db
    .select({
      id: users.id,
      nomComplet: users.nomComplet,
      email: users.email,
      role: users.role,
      actif: users.actif,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.nomComplet);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Utilisateurs</Title>
        <UtilisateurCreationDialog />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <UtilisateursTable liste={liste} currentUserId={Number(session!.user.id)} />
      </Paper>
    </Stack>
  );
}
