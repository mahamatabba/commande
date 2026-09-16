import { redirect } from "next/navigation";
import { ilike, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Badge, Button, Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
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
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Articles</Title>
        {peutEcrire && <ArticleFormDialog action={creerArticle} />}
      </Group>

      <form className="max-w-sm">
        <TextInput name="q" placeholder="Rechercher un article..." defaultValue={q} />
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          records={liste}
          idAccessor="id"
          withTableBorder={false}
          noRecordsText="Aucun article."
          columns={[
            { accessor: "code", title: "Code", render: (a) => <span className="font-mono text-xs tabular-nums">{a.code}</span> },
            { accessor: "designation", title: "Désignation", render: (a) => <span className="font-medium">{a.designation}</span> },
            {
              accessor: "prixAchatIndicatif",
              title: "Prix d'achat",
              textAlign: "right",
              render: (a) => <span className="font-mono tabular-nums">{formatMontant(a.prixAchatIndicatif)}</span>,
            },
            {
              accessor: "prixVente",
              title: "Prix de vente",
              textAlign: "right",
              render: (a) => <span className="font-mono tabular-nums">{formatMontant(a.prixVente)}</span>,
            },
            {
              accessor: "tauxTva",
              title: "TVA",
              textAlign: "right",
              render: (a) => <span className="font-mono tabular-nums">{a.tauxTva}%</span>,
            },
            {
              accessor: "actif",
              title: "Statut",
              render: (a) => (
                <Badge color={a.actif ? "green" : "gray"} variant="light">
                  {a.actif ? "Actif" : "Inactif"}
                </Badge>
              ),
            },
            {
              accessor: "actions",
              title: "Actions",
              textAlign: "right",
              render: (a) =>
                peutEcrire && (
                  <Group justify="flex-end" gap="xs">
                    <ArticleFormDialog
                      action={modifierArticle.bind(null, a.id)}
                      article={a}
                      trigger={
                        <Button variant="subtle" size="xs">
                          Modifier
                        </Button>
                      }
                    />
                    <form action={basculerActifArticle.bind(null, a.id, !a.actif)}>
                      <Button type="submit" variant="subtle" size="xs">
                        {a.actif ? "Désactiver" : "Activer"}
                      </Button>
                    </form>
                  </Group>
                ),
            },
          ]}
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
