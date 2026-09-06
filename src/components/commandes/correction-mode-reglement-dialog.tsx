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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Réservé à l'admin (`requirePermission(session, "commandes_client:corriger")`
 * côté serveur) : permet de corriger le mode de règlement d'une commande déjà
 * saisie par un agent (ex : enregistrée à tort en espèces alors qu'elle est à
 * crédit).
 */
export function CorrectionModeReglementDialog({
  action,
  modeReglementActuel,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  modeReglementActuel: "ESPECES" | "BON_DE_COMMANDE";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success("Mode de règlement corrigé");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Corriger</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corriger le mode de règlement</DialogTitle>
          <DialogDescription>
            À utiliser uniquement pour corriger une erreur de saisie. Cette action est tracée.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="modeReglement">Mode de règlement *</Label>
            <Select name="modeReglement" defaultValue={modeReglementActuel} required>
              <SelectTrigger id="modeReglement" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ESPECES">Espèces (comptant)</SelectItem>
                <SelectItem value="BON_DE_COMMANDE">Bon de commande (à crédit)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer la correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
