"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LignesEditor, type ArticleCatalogue } from "@/components/commandes/lignes-editor";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { creerFournisseur } from "@/app/(dashboard)/fournisseurs/actions";
import { creerCommandeFournisseur } from "@/app/(dashboard)/commandes-fournisseur/actions";
import { formatMontant } from "@/lib/format";

type FournisseurOption = { id: number; nom: string };

export function CommandeFournisseurForm({
  fournisseurs,
  articles,
}: {
  fournisseurs: FournisseurOption[];
  articles: ArticleCatalogue[];
}) {
  const [state, formAction, pending] = useActionState(creerCommandeFournisseur, {
    error: null,
    success: false,
  });
  const [listeFournisseurs, setListeFournisseurs] = useState<FournisseurOption[]>(fournisseurs);
  const [fournisseurId, setFournisseurId] = useState<string>("");
  const [total, setTotal] = useState(0);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations de l&apos;achat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fournisseurId">Fournisseur *</Label>
              <div className="flex gap-2">
                <Select
                  name="fournisseurId"
                  value={fournisseurId}
                  onValueChange={(v) => setFournisseurId(v ?? "")}
                  required
                >
                  <SelectTrigger id="fournisseurId" className="w-full">
                    <SelectValue placeholder="Choisir un fournisseur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listeFournisseurs.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FournisseurFormDialog
                  action={creerFournisseur}
                  onCreated={(f) => {
                    setListeFournisseurs((prev) => [...prev, f]);
                    setFournisseurId(String(f.id));
                  }}
                  trigger={
                    <Button type="button" variant="outline" size="icon" aria-label="Nouveau fournisseur">
                      <Plus className="size-4" />
                    </Button>
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateCommande">Date de commande *</Label>
              <Input
                id="dateCommande"
                name="dateCommande"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <LignesEditor name="lignes" articles={articles} champPrix="achat" onTotalChange={setTotal} />
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6">
        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Total de l&apos;achat</span>
              <span className="font-mono text-2xl font-semibold tabular-nums">{formatMontant(total)}</span>
            </div>

            {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enregistrement..." : "Créer l'achat"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
