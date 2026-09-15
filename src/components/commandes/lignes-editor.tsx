"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { ActionIcon, Button, NumberInput, Select, Table, TextInput } from "@mantine/core";
import { formatMontant } from "@/lib/format";
import type { LigneInput } from "@/lib/validations";
import { ArticleFormDialog } from "@/components/articles/article-form-dialog";
import { creerArticle } from "@/app/(dashboard)/articles/actions";

export type ArticleCatalogue = {
  id: number;
  code: string;
  designation: string;
  prix: number;
};

const LIGNE_VIDE: LigneInput = {
  articleId: null,
  designation: "",
  quantite: 1,
  prixUnitaire: 0,
};

/**
 * Un champ numérique vidé renvoie `""`, que `Number("")` transforme en `0`
 * mais `Number("1,5")` en `NaN`. Ce `NaN` se propageait au total affiché puis
 * au JSON envoyé au serveur, où il devenait `null` et faisait échouer la
 * validation avec un message incompréhensible. On retombe donc sur 0.
 */
function lireNombre(valeur: number | string): number {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

/** Quantité minimale : une ligne à 0 serait refusée à l'enregistrement. */
const QUANTITE_MIN = 1;

export function LignesEditor({
  name,
  articles,
  lignesInitiales,
  champPrix,
  onTotalChange,
}: {
  /** Nom de l'input caché qui reçoit le JSON des lignes pour la Server Action. */
  name: string;
  articles: ArticleCatalogue[];
  lignesInitiales?: LigneInput[];
  /** Détermine quel prix catalogue utiliser pour un article créé à la volée. */
  champPrix: "achat" | "vente";
  /** Optionnel : notifie le parent du total courant (ex. pour un récapitulatif). */
  onTotalChange?: (total: number) => void;
}) {
  const [catalogue, setCatalogue] = useState<ArticleCatalogue[]>(articles);
  const [lignes, setLignes] = useState<LigneInput[]>(
    lignesInitiales && lignesInitiales.length > 0 ? lignesInitiales : [{ ...LIGNE_VIDE }],
  );

  const total = useMemo(
    () => lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0),
    [lignes],
  );

  useEffect(() => {
    onTotalChange?.(total);
  }, [total, onTotalChange]);

  function majLigne(index: number, patch: Partial<LigneInput>) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function choisirArticle(index: number, articleId: number) {
    const article = catalogue.find((a) => a.id === articleId);
    if (!article) return;
    majLigne(index, {
      articleId: article.id,
      designation: article.designation,
      prixUnitaire: article.prix,
    });
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, { ...LIGNE_VIDE }]);
  }

  function supprimerLigne(index: number) {
    setLignes((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function articleCree(article: {
    id: number;
    code: string;
    designation: string;
    prixAchatIndicatif: number;
    prixVente: number;
  }) {
    const nouvelArticle: ArticleCatalogue = {
      id: article.id,
      code: article.code,
      designation: article.designation,
      prix: champPrix === "achat" ? article.prixAchatIndicatif : article.prixVente,
    };
    setCatalogue((prev) => [...prev, nouvelArticle]);
    setLignes((prev) => [
      ...prev,
      {
        articleId: nouvelArticle.id,
        designation: nouvelArticle.designation,
        quantite: 1,
        prixUnitaire: nouvelArticle.prix,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(lignes)} />

      <div className="overflow-x-auto rounded-md border border-[var(--mantine-color-dark-4)] bg-[var(--mantine-color-dark-6)]">
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={80}>Code</Table.Th>
              <Table.Th w={224}>Article</Table.Th>
              <Table.Th>Désignation</Table.Th>
              <Table.Th w={128}>Qté</Table.Th>
              <Table.Th w={128}>P.U. HT</Table.Th>
              <Table.Th w={128} ta="right">Montant HT</Table.Th>
              <Table.Th w={40} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lignes.map((ligne, index) => {
              const article = catalogue.find((a) => a.id === ligne.articleId);
              return (
                <Table.Tr key={index}>
                  <Table.Td className="font-mono text-xs text-[var(--mantine-color-dimmed)]">
                    {article?.code ?? "—"}
                  </Table.Td>
                  <Table.Td>
                    <Select
                      value={ligne.articleId ? String(ligne.articleId) : null}
                      onChange={(v) => v && choisirArticle(index, Number(v))}
                      data={catalogue.map((a) => ({
                        value: String(a.id),
                        label: `${a.code} — ${a.designation}`,
                      }))}
                      placeholder="Article libre..."
                      searchable
                      nothingFoundMessage="Aucun article"
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      value={ligne.designation}
                      onChange={(e) => majLigne(index, { designation: e.target.value })}
                      placeholder="Désignation"
                      required
                    />
                  </Table.Td>
                  <Table.Td>
                    <div className="flex items-center gap-1">
                      <ActionIcon
                        type="button"
                        variant="default"
                        size="lg"
                        disabled={ligne.quantite <= QUANTITE_MIN}
                        onClick={() =>
                          majLigne(index, {
                            quantite: Math.max(QUANTITE_MIN, ligne.quantite - 1),
                          })
                        }
                      >
                        <Minus size={14} />
                      </ActionIcon>
                      <NumberInput
                        min={0.01}
                        step={0.01}
                        value={ligne.quantite}
                        onChange={(v) => majLigne(index, { quantite: lireNombre(v) })}
                        onBlur={() => {
                          if (ligne.quantite <= 0) majLigne(index, { quantite: QUANTITE_MIN });
                        }}
                        required
                        hideControls
                        error={ligne.quantite <= 0}
                        classNames={{ input: "text-center font-mono tabular-nums" }}
                        w={64}
                      />
                      <ActionIcon
                        type="button"
                        variant="default"
                        size="lg"
                        onClick={() => majLigne(index, { quantite: ligne.quantite + 1 })}
                      >
                        <Plus size={14} />
                      </ActionIcon>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      min={0}
                      step={1}
                      value={ligne.prixUnitaire}
                      onChange={(v) => majLigne(index, { prixUnitaire: lireNombre(v) })}
                      required
                      hideControls
                      classNames={{ input: "font-mono tabular-nums" }}
                    />
                  </Table.Td>
                  <Table.Td className="text-right font-mono font-medium tabular-nums">
                    {formatMontant(ligne.quantite * ligne.prixUnitaire)}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      type="button"
                      variant="subtle"
                      color="red"
                      size="lg"
                      disabled={lignes.length === 1}
                      onClick={() => supprimerLigne(index)}
                    >
                      <X size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="default" size="sm" onClick={ajouterLigne}>
            + Ajouter une ligne
          </Button>
          <ArticleFormDialog
            action={creerArticle}
            onCreated={articleCree}
            trigger={
              <Button type="button" variant="default" size="sm" leftSection={<Plus size={16} />}>
                Nouvel article
              </Button>
            }
          />
        </div>
        <p className="font-mono text-lg font-semibold tabular-nums">
          Total HT : {formatMontant(total)}
        </p>
      </div>
    </div>
  );
}
