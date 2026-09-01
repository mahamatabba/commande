import Link from "next/link";
import { ilike, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { can } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { creerClient, basculerActifClient } from "./actions";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageClients({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const { q } = await searchParams;
  const peutEcrire = can(session, "referentiels:write");

  const liste = await db
    .select()
    .from(clients)
    .where(
      q
        ? or(ilike(clients.nom, `%${q}%`), ilike(clients.raisonSociale, `%${q}%`), ilike(clients.telephone, `%${q}%`))
        : undefined,
    )
    .orderBy(clients.nom);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clients</h1>
        {peutEcrire && <ClientFormDialog action={creerClient} />}
      </div>

      <form className="max-w-sm">
        <Input name="q" placeholder="Rechercher un client..." defaultValue={q} />
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom / Raison sociale</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/clients/${c.id}`} className="hover:underline">
                    {nomAffiche(c)}
                  </Link>
                </TableCell>
                <TableCell>{c.telephone}</TableCell>
                <TableCell>{c.nif ? <Badge variant="secondary">NIF</Badge> : "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.actif ? "default" : "outline"}>{c.actif ? "Actif" : "Inactif"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button render={<Link href={`/clients/${c.id}`} />} variant="ghost" size="sm">
                      Voir
                    </Button>
                    {peutEcrire && (
                      <form action={basculerActifClient.bind(null, c.id, !c.actif)}>
                        <Button type="submit" variant="ghost" size="sm">
                          {c.actif ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {liste.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-zinc-500">
                  Aucun client.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
