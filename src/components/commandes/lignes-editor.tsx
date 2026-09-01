"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

      <div className="overflow-x-auto rounded-[2px] border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Code</TableHead>
              <TableHead className="w-56">Article</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead className="w-32">Qté</TableHead>
              <TableHead className="w-32">P.U.</TableHead>
              <TableHead className="w-32 text-right">Montant</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.map((ligne, index) => {
              const article = catalogue.find((a) => a.id === ligne.articleId);
              return (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {article?.code ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ligne.articleId ? String(ligne.articleId) : undefined}
                      onValueChange={(v) => choisirArticle(index, Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Article libre..." />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogue.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.code} — {a.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={ligne.designation}
                      onChange={(e) => majLigne(index, { designation: e.target.value })}
                      placeholder="Désignation"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          majLigne(index, { quantite: Math.max(0, ligne.quantite - 1) })
                        }
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={ligne.quantite}
                        onChange={(e) => majLigne(index, { quantite: Number(e.target.value) })}
                        required
                        className="w-14 px-1 text-center font-mono tabular-nums"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => majLigne(index, { quantite: ligne.quantite + 1 })}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={ligne.prixUnitaire}
                      onChange={(e) => majLigne(index, { prixUnitaire: Number(e.target.value) })}
                      required
                      className="font-mono tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium tabular-nums">
                    {formatMontant(ligne.quantite * ligne.prixUnitaire)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={lignes.length === 1}
                      onClick={() => supprimerLigne(index)}
                      className="text-[#8A211C] hover:bg-[#F8E8E6] hover:text-[#8A211C]"
                    >
                      <X className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={ajouterLigne}>
            + Ajouter une ligne
          </Button>
          <ArticleFormDialog
            action={creerArticle}
            onCreated={articleCree}
            trigger={
              <Button type="button" variant="outline" size="sm">
                <Plus className="size-4" /> Nouvel article
              </Button>
            }
          />
        </div>
        <p className="font-mono text-lg font-semibold tabular-nums">
          Total : {formatMontant(total)}
        </p>
      </div>
    </div>
  );
}
