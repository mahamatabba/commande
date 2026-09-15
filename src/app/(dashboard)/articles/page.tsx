import { redirect } from "next/navigation";
import { ilike, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArticleFormDialog } from "@/components/articles/article-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { creerArticle, modifierArticle, basculerActifArticle } from "./actions";

/** Nombre d'articles affichés par page. */
const PAR_PAGE = 50;

export default async function PageArticles({
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

  const filtre = q ? ilike(articles.designation, `%${q}%`) : undefined;

  const [comptes, liste] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(articles).where(filtre),
    db
      .select()
      .from(articles)
      .where(filtre)
      // L'`id` fige l'ordre entre désignations identiques.
      .orderBy(articles.designation, articles.id)
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/articles", params, pageCourante));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Articles</h1>
        {peutEcrire && <ArticleFormDialog action={creerArticle} />}
      </div>

      <form className="max-w-sm">
        <Input name="q" placeholder="Rechercher un article..." defaultValue={q} />
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Prix d&apos;achat</TableHead>
              <TableHead className="text-right">Prix de vente</TableHead>
              <TableHead className="text-right">TVA</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs tabular-nums">{a.code}</TableCell>
                <TableCell className="font-medium">{a.designation}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMontant(a.prixAchatIndicatif)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMontant(a.prixVente)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{a.tauxTva}%</TableCell>
                <TableCell>
                  <Badge variant={a.actif ? "default" : "outline"}>{a.actif ? "Actif" : "Inactif"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {peutEcrire && (
                      <>
                        <ArticleFormDialog
                          action={modifierArticle.bind(null, a.id)}
                          article={a}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Modifier
                            </Button>
                          }
                        />
                        <form action={basculerActifArticle.bind(null, a.id, !a.actif)}>
                          <Button type="submit" variant="ghost" size="sm">
                            {a.actif ? "Désactiver" : "Activer"}
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
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Aucun article.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationListe
        base="/articles"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="article"
      />
    </div>
  );
}
