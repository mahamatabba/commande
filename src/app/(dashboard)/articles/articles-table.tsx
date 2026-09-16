"use client";

import { Badge, Button, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { formatMontant } from "@/lib/format";
import { ArticleFormDialog } from "@/components/articles/article-form-dialog";
import type { modifierArticle as modifierArticleAction, basculerActifArticle as basculerActifArticleAction } from "./actions";

type Article = {
  id: number;
  code: string;
  designation: string;
  prixAchatIndicatif: number;
  prixVente: number;
  tauxTva: number;
  actif: boolean;
};

export function ArticlesTable({
  liste,
  peutEcrire,
  modifierArticle,
  basculerActifArticle,
}: {
  liste: Article[];
  peutEcrire: boolean;
  modifierArticle: typeof modifierArticleAction;
  basculerActifArticle: typeof basculerActifArticleAction;
}) {
  return (
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
  );
}
