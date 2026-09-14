"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Passage rapide d'une facture à « Payée » depuis son propre écran, sans
 * passer par la liste des règlements.
 *
 * Le formulaire demande tout de même le moyen et la date, parce que cette
 * action enregistre un vrai encaissement qui entre en caisse : le raccourci
 * porte sur le nombre de clics, jamais sur la traçabilité.
 */
export function MarquerPayeeDialog({
  action,
  resteAPayer,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  resteAPayer: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success("Facture soldée");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Marquer payée</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marquer la facture payée</DialogTitle>
          <DialogDescription>
            Un encaissement de {formatMontant(resteAPayer)} sera enregistré et entrera en caisse.
            La facture passera au statut « Soldée ».
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="dateReglement">Date du règlement *</Label>
              <Input
                id="dateReglement"
                name="dateReglement"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
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
          </div>

          <div className="space-y-1">
            <Label htmlFor="commentaire">Commentaire</Label>
            <Textarea id="commentaire" name="commentaire" rows={2} />
          </div>

          {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : `Encaisser ${formatMontant(resteAPayer)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
