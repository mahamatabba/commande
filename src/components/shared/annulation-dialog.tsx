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
import { Textarea } from "@/components/ui/textarea";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Dialogue générique pour toute annulation (commande fournisseur, commande
 * client, facture, règlement) — le motif est toujours obligatoire et l'action
 * est toujours réservée à l'admin (vérifié côté serveur par
 * `requirePermission(session, "annulation:effectuer")`).
 */
export function AnnulationDialog({
  action,
  titre = "Annuler",
  description = "Cette action est définitive et sera tracée. Le motif est obligatoire.",
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  titre?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success("Annulation effectuée");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive">{titre}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="motif">Motif *</Label>
            <Textarea id="motif" name="motif" required minLength={3} rows={3} />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
