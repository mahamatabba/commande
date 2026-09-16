import { redirect } from "next/navigation";
import { ilike, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { ArticleFormDialog } from "@/components/articles/article-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { ArticlesTable } from "./articles-table";
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
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Articles</Title>
        {peutEcrire && <ArticleFormDialog action={creerArticle} />}
      </Group>

      <form className="max-w-sm">
        <TextInput name="q" placeholder="Rechercher un article..." defaultValue={q} />
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <ArticlesTable
          liste={liste}
          peutEcrire={peutEcrire}
          modifierArticle={modifierArticle}
          basculerActifArticle={basculerActifArticle}
        />
      </Paper>

      <PaginationListe
        base="/articles"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="article"
      />
    </Stack>
  );
}
