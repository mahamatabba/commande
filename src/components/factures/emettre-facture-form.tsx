"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMontant } from "@/lib/format";
import { TAUX_TVA_STANDARD } from "@/lib/constants";
import { decomposerTva, formatTaux } from "@/lib/tva";
import { emettreFacture } from "@/app/(dashboard)/factures/actions";

/**
 * Le régime de TVA est un choix explicite fait au moment d'émettre : tous les
 * clients n'y sont pas assujettis, et le montant réclamé en dépend. La fiche
 * client ne fait que positionner la valeur par défaut, modifiable ici au cas
 * par cas.
 */
export function EmettreFactureForm({
  commandeClientId,
  montantHt,
  exonerePartDefaut,
}: {
  commandeClientId: number;
  montantHt: number;
  exonerePartDefaut: boolean;
}) {
  const [state, formAction, pending] = useActionState(emettreFacture, {
    error: null,
    success: false,
  });
  const [exonere, setExonere] = useState(exonerePartDefaut);

  const totaux = decomposerTva(montantHt, { exonere });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="commandeClientId" value={commandeClientId} />
      <input type="hidden" name="regimeTva" value={exonere ? "EXONERE" : "ASSUJETTI"} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">TVA</legend>

        <label className="flex cursor-pointer items-start gap-2 rounded-[2px] border border-border p-3 has-checked:border-[#1E3A5F] has-checked:bg-[#EEF2F7]">
          <input
            type="radio"
            name="choixTva"
            className="mt-0.5"
            checked={!exonere}
            onChange={() => setExonere(false)}
          />
          <span className="text-sm">
            <span className="font-medium">Soumise à la TVA</span>
            <span className="block text-xs text-muted-foreground">
              {formatTaux(TAUX_TVA_STANDARD)} ajoutés au montant hors taxe.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-[2px] border border-border p-3 has-checked:border-[#1E3A5F] has-checked:bg-[#EEF2F7]">
          <input
            type="radio"
            name="choixTva"
            className="mt-0.5"
            checked={exonere}
            onChange={() => setExonere(true)}
          />
          <span className="text-sm">
            <span className="font-medium">Exonérée</span>
            <span className="block text-xs text-muted-foreground">
              Aucune TVA facturée. Le client paie le montant hors taxe.
            </span>
          </span>
        </label>
      </fieldset>

      <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Total HT</dt>
          <dd className="font-mono tabular-nums">{formatMontant(totaux.montantHt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            TVA {totaux.exonereTva ? "(exonérée)" : `(${formatTaux(totaux.tauxTva)})`}
          </dt>
          <dd className="font-mono tabular-nums">{formatMontant(totaux.montantTva)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <dt className="font-medium">Total TTC</dt>
          <dd className="font-mono text-xl font-semibold tabular-nums">
            {formatMontant(totaux.montantTotal)}
          </dd>
        </div>
      </dl>

      {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Émission..." : "Émettre la facture"}
      </Button>
    </form>
  );
}
