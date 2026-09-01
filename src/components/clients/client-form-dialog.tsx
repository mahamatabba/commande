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
import type { EtatFormulaire } from "@/app/(dashboard)/clients/actions";

type Client = {
  id: number;
  nom: string;
  prenom: string | null;
  raisonSociale: string | null;
  telephone: string;
  email: string | null;
  adresse: string | null;
  nif: string | null;
};

export function ClientFormDialog({
  action,
  client,
  trigger,
  onCreated,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  client?: Client;
  trigger?: React.ReactElement;
  onCreated?: (client: { id: number; nom: string; prenom: string | null; raisonSociale: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success(client ? "Client modifié" : "Client créé");
      if (!client && state.client) {
        onCreated?.(state.client);
      }
    }
  }, [state, client, onCreated]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>Nouveau client</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" name="nom" required defaultValue={client?.nom} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" name="prenom" defaultValue={client?.prenom ?? ""} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="raisonSociale">Raison sociale</Label>
            <Input id="raisonSociale" name="raisonSociale" defaultValue={client?.raisonSociale ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telephone">Téléphone *</Label>
            <Input id="telephone" name="telephone" required defaultValue={client?.telephone} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" name="adresse" defaultValue={client?.adresse ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nif">NIF</Label>
            <Input id="nif" name="nif" defaultValue={client?.nif ?? ""} />
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
