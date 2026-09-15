import Link from "next/link";
import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { fournisseurs } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { creerFournisseur, modifierFournisseur, basculerActifFournisseur } from "./actions";

/** Nombre de fournisseurs affichés par page. */
const PAR_PAGE = 50;

export default async function PageFournisseurs({
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
    ? or(ilike(fournisseurs.nom, `%${q}%`), ilike(fournisseurs.telephone, `%${q}%`))
    : undefined;

  const [comptes, liste] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(fournisseurs).where(filtre),
    db
      .select()
      .from(fournisseurs)
      .where(filtre)
      // L'`id` fige l'ordre entre homonymes, sinon une ligne peut se répéter
      // d'une page à l'autre pendant qu'une autre disparaît.
      .orderBy(fournisseurs.nom, fournisseurs.id)
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/fournisseurs", params, pageCourante));
  }

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
                      <>
                        {/* Même dialogue que sur la fiche : corriger un
                            téléphone ne demande plus d'ouvrir une page. */}
                        <FournisseurFormDialog
                          action={modifierFournisseur.bind(null, f.id)}
                          fournisseur={f}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Modifier
                            </Button>
                          }
                        />
                        <form action={basculerActifFournisseur.bind(null, f.id, !f.actif)}>
                          <Button type="submit" variant="ghost" size="sm">
                            {f.actif ? "Désactiver" : "Activer"}
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
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucun fournisseur.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationListe
        base="/fournisseurs"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="fournisseur"
      />
    </div>
  );
}
