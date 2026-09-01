"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMontant } from "@/lib/format";
import { saisirReglement } from "@/app/(dashboard)/reglements/actions";

export type FactureEligible = { id: number; numero: string; nomAffiche: string; resteAPayer: number };
export type CommandeFournisseurEligible = {
  id: number;
  numero: string;
  fournisseurNom: string;
  resteAPayer: number;
};

export function ReglementForm({
  factures,
  commandes,
}: {
  factures: FactureEligible[];
  commandes: CommandeFournisseurEligible[];
}) {
  const [open, setOpen] = useState(false);
  const [cible, setCible] = useState<"facture" | "commande_fournisseur">("facture");
  const [cibleId, setCibleId] = useState<string>("");
  const [state, formAction, pending] = useActionState(saisirReglement, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setCibleId("");
      toast.success("Règlement enregistré");
    }
  }, [state]);

  const cibleActuelle = cible === "facture" ? factures : commandes;
  const resteAPayer = useMemo(() => {
    const item = cibleActuelle.find((c) => String(c.id) === cibleId);
    return item?.resteAPayer ?? null;
  }, [cibleActuelle, cibleId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setCibleId("");
      }}
    >
      <DialogTrigger render={<Button>Nouveau règlement</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau règlement</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cible">Type *</Label>
            <Select
              name="cible"
              value={cible}
              onValueChange={(v) => {
                setCible(v as "facture" | "commande_fournisseur");
                setCibleId("");
              }}
              required
            >
              <SelectTrigger id="cible" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facture">Encaissement — Facture client</SelectItem>
                <SelectItem value="commande_fournisseur">Décaissement — Achat fournisseur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cibleId">
              {cible === "facture" ? "Facture *" : "Achat fournisseur *"}
            </Label>
            <Select
              name="cibleId"
              value={cibleId}
              onValueChange={(v) => setCibleId(v ?? "")}
              required
            >
              <SelectTrigger id="cibleId" className="w-full">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {cible === "facture"
                  ? factures.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.numero} — {f.nomAffiche} (reste {formatMontant(f.resteAPayer)})
                      </SelectItem>
                    ))
                  : commandes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.numero} — {c.fournisseurNom} (reste {formatMontant(c.resteAPayer)})
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="montant">Montant (FCFA) *</Label>
              <Input
                id="montant"
                name="montant"
                type="number"
                min={1}
                max={resteAPayer ?? undefined}
                required
                className="font-mono tabular-nums"
              />
              {resteAPayer !== null && (
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  Reste à payer : {formatMontant(resteAPayer)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateReglement">Date *</Label>
              <Input
                id="dateReglement"
                name="dateReglement"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="moyen">Moyen *</Label>
            <Select name="moyen" defaultValue="ESPECES" required>
              <SelectTrigger id="moyen" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ESPECES">Espèces</SelectItem>
                <SelectItem value="VIREMENT">Virement</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="commentaire">Commentaire</Label>
            <Textarea id="commentaire" name="commentaire" rows={2} />
          </div>

          {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending || !cibleId}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
