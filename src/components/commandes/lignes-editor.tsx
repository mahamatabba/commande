"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMontant } from "@/lib/format";
import type { LigneInput } from "@/lib/validations";

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
}: {
  /** Nom de l'input caché qui reçoit le JSON des lignes pour la Server Action. */
  name: string;
  articles: ArticleCatalogue[];
  lignesInitiales?: LigneInput[];
}) {
  const [lignes, setLignes] = useState<LigneInput[]>(
    lignesInitiales && lignesInitiales.length > 0 ? lignesInitiales : [{ ...LIGNE_VIDE }],
  );

  const total = useMemo(
    () => lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0),
    [lignes],
  );

  function majLigne(index: number, patch: Partial<LigneInput>) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function choisirArticle(index: number, articleId: number) {
    const article = articles.find((a) => a.id === articleId);
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

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(lignes)} />

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="w-56 p-2 font-medium">Article</th>
              <th className="p-2 font-medium">Désignation</th>
              <th className="w-24 p-2 font-medium">Qté</th>
              <th className="w-32 p-2 font-medium">Prix unitaire</th>
              <th className="w-32 p-2 text-right font-medium">Montant</th>
              <th className="w-10 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="p-2 align-top">
                  <Select
                    value={ligne.articleId ? String(ligne.articleId) : undefined}
                    onValueChange={(v) => choisirArticle(index, Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Article libre..." />
                    </SelectTrigger>
                    <SelectContent>
                      {articles.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.code} — {a.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2 align-top">
                  <Input
                    value={ligne.designation}
                    onChange={(e) => majLigne(index, { designation: e.target.value })}
                    placeholder="Désignation"
                    required
                  />
                </td>
                <td className="p-2 align-top">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={ligne.quantite}
                    onChange={(e) => majLigne(index, { quantite: Number(e.target.value) })}
                    required
                  />
                </td>
                <td className="p-2 align-top">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={ligne.prixUnitaire}
                    onChange={(e) => majLigne(index, { prixUnitaire: Number(e.target.value) })}
                    required
                  />
                </td>
                <td className="p-2 text-right align-top font-medium">
                  {formatMontant(ligne.quantite * ligne.prixUnitaire)}
                </td>
                <td className="p-2 align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={lignes.length === 1}
                    onClick={() => supprimerLigne(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={ajouterLigne}>
          + Ajouter une ligne
        </Button>
        <p className="text-lg font-semibold">Total : {formatMontant(total)}</p>
      </div>
    </div>
  );
}
