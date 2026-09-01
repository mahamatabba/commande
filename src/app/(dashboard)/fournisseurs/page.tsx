import Link from "next/link";
import { ilike, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { fournisseurs } from "@/db/schema";
import { can } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { creerFournisseur, basculerActifFournisseur } from "./actions";

export default async function PageFournisseurs({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const { q } = await searchParams;
  const peutEcrire = can(session, "referentiels:write");

  const liste = await db
    .select()
    .from(fournisseurs)
    .where(q ? or(ilike(fournisseurs.nom, `%${q}%`), ilike(fournisseurs.telephone, `%${q}%`)) : undefined)
    .orderBy(fournisseurs.nom);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Fournisseurs</h1>
        {peutEcrire && <FournisseurFormDialog action={creerFournisseur} />}
      </div>

      <form className="max-w-sm">
        <Input name="q" placeholder="Rechercher un fournisseur..." defaultValue={q} />
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">
                  <Link href={`/fournisseurs/${f.id}`} className="hover:underline">
                    {f.nom}
                  </Link>
                </TableCell>
                <TableCell className="font-mono tabular-nums">{f.telephone}</TableCell>
                <TableCell>{f.email ?? "—"}</TableCell>
                <TableCell>
                  {f.nif ? <Badge variant="secondary">NIF</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={f.actif ? "default" : "outline"}>
                    {f.actif ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button render={<Link href={`/fournisseurs/${f.id}`} />} variant="ghost" size="sm">
                      Voir
                    </Button>
                    {peutEcrire && (
                      <form action={basculerActifFournisseur.bind(null, f.id, !f.actif)}>
                        <Button type="submit" variant="ghost" size="sm">
                          {f.actif ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {liste.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucun fournisseur.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
