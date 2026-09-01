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
import type { EtatFormulaire } from "@/app/(dashboard)/articles/actions";

type Article = {
  id: number;
  code: string;
  designation: string;
  prixAchatIndicatif: number;
  prixVente: number;
  tauxTva: number;
};

export function ArticleFormDialog({
  action,
  article,
  trigger,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  article?: Article;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      toast.success(article ? "Article modifié" : "Article créé");
    }
  }, [state, article]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>Nouvel article</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{article ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" name="code" required defaultValue={article?.code} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tauxTva">Taux TVA (%)</Label>
              <Input
                id="tauxTva"
                name="tauxTva"
                type="number"
                step="0.01"
                defaultValue={article?.tauxTva ?? 18}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="designation">Désignation *</Label>
            <Input id="designation" name="designation" required defaultValue={article?.designation} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="prixAchatIndicatif">Prix d&apos;achat indicatif (FCFA)</Label>
              <Input
                id="prixAchatIndicatif"
                name="prixAchatIndicatif"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={article?.prixAchatIndicatif}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prixVente">Prix de vente (FCFA) *</Label>
              <Input
                id="prixVente"
                name="prixVente"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={article?.prixVente}
              />
            </div>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
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
