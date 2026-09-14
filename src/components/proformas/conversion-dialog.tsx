"use client";

import { useActionState } from "react";
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
import { formatMontant } from "@/lib/format";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Confirmation avant de transformer une proforma en facture définitive.
 *
 * La conversion n'est pas anodine : elle crée la créance, passe la vente au
 * statut « Facturée » et, pour une vente au comptant, enregistre
 * immédiatement l'encaissement en caisse. L'écran l'annonce donc avant, pas
 * après. En cas de succès l'action redirige vers la facture créée : il n'y a
 * rien à refermer ici.
 */
export function ConversionProformaDialog({
  action,
  montantTotal,
  auComptant,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  montantTotal: number;
  auComptant: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  return (
    <Dialog>
      <DialogTrigger render={<Button>Convertir en facture</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir en facture définitive</DialogTitle>
          <DialogDescription>
            Une facture de {formatMontant(montantTotal)} sera émise et numérotée, et la vente
            passera au statut « Facturée ».
            {auComptant
              ? " Cette vente étant au comptant, l'encaissement du montant total sera enregistré en caisse dans la foulée."
              : " La facture sera émise en « Non payée » : les règlements se saisissent ensuite."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Conversion..." : "Confirmer la conversion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
