import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { formatDateHeure } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Utilisateurs</h1>
        <UtilisateurCreationDialog />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.nomComplet}
                  {u.id === Number(session.user.id) && (
                    <span className="ml-2 text-xs text-zinc-500">(vous)</span>
                  )}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{LABEL_ROLE[u.role] ?? u.role}</TableCell>
                <TableCell>
                  <Badge variant={u.actif ? "default" : "outline"}>
                    {u.actif ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateHeure(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <UtilisateurEditDialog utilisateur={u} />
                    <ReinitialiserMotDePasseDialog id={u.id} nom={u.nomComplet} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {liste.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-zinc-500">
                  Aucun utilisateur.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
