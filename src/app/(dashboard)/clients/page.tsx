import Link from "next/link";
import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { creerClient, modifierClient, basculerActifClient } from "./actions";

/** Nombre de clients affichés par page. */
const PAR_PAGE = 50;

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageClients({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "referentiels:read");
  const params = await searchParams;
  const { q } = params;
  const pageDemandee = lirePage(params.page);
  const peutEcrire = can(session, "referentiels:write");

  const filtre = q
    ? or(
        ilike(clients.nom, `%${q}%`),
        ilike(clients.raisonSociale, `%${q}%`),
        ilike(clients.telephone, `%${q}%`),
      )
    : undefined;

  const [comptes, liste] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(clients).where(filtre),
    db
      .select()
      .from(clients)
      .where(filtre)
      // Le nom seul ne suffit pas à ordonner : deux homonymes peuvent changer
      // de place entre deux pages, l'un apparaissant deux fois et l'autre pas
      // du tout. L'`id` fige l'ordre.
      .orderBy(clients.nom, clients.id)
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/clients", params, pageCourante));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clients</h1>
        {peutEcrire && <ClientFormDialog action={creerClient} />}
      </div>

      <form className="max-w-sm">
        <Input name="q" placeholder="Rechercher un client..." defaultValue={q} />
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
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
                <TableCell className="font-mono tabular-nums">{c.telephone}</TableCell>
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
                      <>
                        {/* Corriger un numéro de téléphone obligeait à ouvrir la
                            fiche pour y trouver le même formulaire : deux
                            chargements de page pour une faute de frappe. Le
                            dialogue est celui de la fiche, à l'identique. */}
                        <ClientFormDialog
                          action={modifierClient.bind(null, c.id)}
                          client={c}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Modifier
                            </Button>
                          }
                        />
                        <form action={basculerActifClient.bind(null, c.id, !c.actif)}>
                          <Button type="submit" variant="ghost" size="sm">
                            {c.actif ? "Désactiver" : "Activer"}
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {liste.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aucun client.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationListe
        base="/clients"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="client"
      />
    </div>
  );
}
