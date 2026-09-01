"use client";

import { useActionState, useEffect, useState } from "react";
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
import { reinitialiserMotDePasse } from "@/app/(dashboard)/utilisateurs/actions";

export function ReinitialiserMotDePasseDialog({ id, nom }: { id: number; nom: string }) {
  const [open, setOpen] = useState(false);
  const action = reinitialiserMotDePasse.bind(null, id);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success("Mot de passe réinitialisé");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Mot de passe</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe de {nom}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="motDePasse">Nouveau mot de passe *</Label>
            <Input id="motDePasse" name="motDePasse" type="password" required minLength={8} />
          </div>
          {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
