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
import type { EtatFormulaire } from "@/app/(dashboard)/fournisseurs/actions";

type Fournisseur = {
  id: number;
  nom: string;
  adresse: string | null;
  telephone: string;
  email: string | null;
  nif: string | null;
};

export function FournisseurFormDialog({
  action,
  fournisseur,
  trigger,
  onCreated,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  fournisseur?: Fournisseur;
  trigger?: React.ReactElement;
  onCreated?: (fournisseur: { id: number; nom: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success(fournisseur ? "Fournisseur modifié" : "Fournisseur créé");
      if (!fournisseur && state.fournisseur) {
        onCreated?.(state.fournisseur);
      }
    }
  }, [state, fournisseur, onCreated]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>Nouveau fournisseur</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" name="nom" required defaultValue={fournisseur?.nom} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telephone">Téléphone *</Label>
            <Input id="telephone" name="telephone" required defaultValue={fournisseur?.telephone} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" name="adresse" defaultValue={fournisseur?.adresse ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={fournisseur?.email ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nif">NIF</Label>
            <Input id="nif" name="nif" defaultValue={fournisseur?.nif ?? ""} />
          </div>
          {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
