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
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { creerClient } from "@/app/(dashboard)/clients/actions";
import { creerCommandeClient } from "@/app/(dashboard)/commandes-client/actions";
import { formatMontant } from "@/lib/format";

type ClientOption = { id: number; nom: string; prenom: string | null; raisonSociale: string | null };

function nomAffiche(c: ClientOption) {
  return c.raisonSociale ?? (c.prenom ? `${c.nom} ${c.prenom}` : c.nom);
}

export function CommandeClientForm({
  clients,
  articles,
}: {
  clients: ClientOption[];
  articles: ArticleCatalogue[];
}) {
  const [state, formAction, pending] = useActionState(creerCommandeClient, {
    error: null,
    success: false,
  });
  const [listeClients, setListeClients] = useState<ClientOption[]>(clients);
  const [clientId, setClientId] = useState<string>("");
  const [total, setTotal] = useState(0);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations de la vente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="clientId">Client *</Label>
              <div className="flex gap-2">
                <Select name="clientId" value={clientId} onValueChange={(v) => setClientId(v ?? "")} required>
                  <SelectTrigger id="clientId" className="w-full">
                    <SelectValue placeholder="Choisir un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listeClients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {nomAffiche(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ClientFormDialog
                  action={creerClient}
                  onCreated={(c) => {
                    setListeClients((prev) => [...prev, c]);
                    setClientId(String(c.id));
                  }}
                  trigger={
                    <Button type="button" variant="outline" size="icon" aria-label="Nouveau client">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <LignesEditor name="lignes" articles={articles} champPrix="vente" onTotalChange={setTotal} />
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
              <span className="text-sm text-muted-foreground">Total de la vente</span>
              <span className="font-mono text-2xl font-semibold tabular-nums">{formatMontant(total)}</span>
            </div>

            {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enregistrement..." : "Créer la vente"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
