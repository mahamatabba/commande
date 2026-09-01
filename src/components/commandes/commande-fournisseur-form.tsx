"use client";

import { useActionState } from "react";
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
import { LignesEditor, type ArticleCatalogue } from "@/components/commandes/lignes-editor";
import { creerCommandeFournisseur } from "@/app/(dashboard)/commandes-fournisseur/actions";

export function CommandeFournisseurForm({
  fournisseurs,
  articles,
}: {
  fournisseurs: { id: number; nom: string }[];
  articles: ArticleCatalogue[];
}) {
  const [state, formAction, pending] = useActionState(creerCommandeFournisseur, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fournisseurId">Fournisseur *</Label>
          <Select name="fournisseurId" required>
            <SelectTrigger id="fournisseurId" className="w-full">
              <SelectValue placeholder="Choisir un fournisseur..." />
            </SelectTrigger>
            <SelectContent>
              {fournisseurs.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <LignesEditor name="lignes" articles={articles} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Créer la commande"}
      </Button>
    </form>
  );
}
