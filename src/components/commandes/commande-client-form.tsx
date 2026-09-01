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
import { creerCommandeClient } from "@/app/(dashboard)/commandes-client/actions";

export function CommandeClientForm({
  clients,
  articles,
}: {
  clients: { id: number; nom: string; prenom: string | null; raisonSociale: string | null }[];
  articles: ArticleCatalogue[];
}) {
  const [state, formAction, pending] = useActionState(creerCommandeClient, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <Label htmlFor="clientId">Client *</Label>
          <Select name="clientId" required>
            <SelectTrigger id="clientId" className="w-full">
              <SelectValue placeholder="Choisir un client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.raisonSociale ?? (c.prenom ? `${c.nom} ${c.prenom}` : c.nom)}
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
        <div className="space-y-1">
          <Label htmlFor="modeReglement">Mode de règlement *</Label>
          <Select name="modeReglement" defaultValue="ESPECES" required>
            <SelectTrigger id="modeReglement" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ESPECES">Espèces (comptant)</SelectItem>
              <SelectItem value="BON_DE_COMMANDE">Bon de commande (à crédit)</SelectItem>
            </SelectContent>
          </Select>
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
