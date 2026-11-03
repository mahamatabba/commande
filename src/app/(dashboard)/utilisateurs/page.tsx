import { auth } from "@/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { Group, Paper, Stack } from "@mantine/core";
import { UtilisateurCreationDialog } from "@/components/utilisateurs/utilisateur-creation-dialog";
import { UtilisateursTable } from "./utilisateurs-table";
import { EnTetePage } from "@/components/shared/en-tete-page";
import { UserCog } from "lucide-react";

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
    .where(eq(users.supprime, false))
    .orderBy(users.nomComplet);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <EnTetePage icone={UserCog} couleur="gray" titre="Utilisateurs" description={"Comptes ayant accès à l'application et leurs rôles."} />
        <UtilisateurCreationDialog />
      </Group>

      <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
        <UtilisateursTable liste={liste} currentUserId={Number(session!.user.id)} />
      </Paper>
    </Stack>
  );
}
