"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatMontant } from "@/lib/format";
import { TAUX_TVA_STANDARD } from "@/lib/constants";
import { decomposerTva, formatTaux } from "@/lib/tva";
import { emettreProforma } from "@/app/(dashboard)/proformas/actions";

const VALIDITE_PAR_DEFAUT = 30;

/**
 * Même choix de régime de TVA que pour une facture — le montant annoncé au
 * client en dépend — auquel s'ajoute la durée de validité de l'offre, qui
 * sera imprimée sur le document.
 */
export function EmettreProformaForm({
  commandeClientId,
  montantHt,
  exonerePartDefaut,
}: {
  commandeClientId: number;
  montantHt: number;
  exonerePartDefaut: boolean;
}) {
  const [state, formAction, pending] = useActionState(emettreProforma, {
    error: null,
    success: false,
  });
  const [exonere, setExonere] = useState(exonerePartDefaut);
  const [validiteJours, setValiditeJours] = useState(String(VALIDITE_PAR_DEFAUT));

  const totaux = decomposerTva(montantHt, { exonere });

  // Aperçu de l'échéance : le client doit voir, avant de valider, jusqu'à
  // quelle date le prix annoncé l'engage.
  const jours = Number(validiteJours);
  const echeance =
    Number.isInteger(jours) && jours >= 1 && jours <= 365
      ? new Date(Date.now() + jours * 24 * 60 * 60 * 1000)
      : null;

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
              Aucune TVA annoncée. Le client paiera le montant hors taxe.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="validiteJours">Validité de l&apos;offre (jours)</Label>
        <Input
          id="validiteJours"
          name="validiteJours"
          type="number"
          min={1}
          max={365}
          required
          value={validiteJours}
          onChange={(e) => setValiditeJours(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {echeance
            ? `Le prix annoncé engage AEI jusqu'au ${formatDate(echeance)}.`
            : "Indiquez un nombre de jours entre 1 et 365."}
        </p>
      </div>

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
        {pending ? "Établissement..." : "Établir la proforma"}
      </Button>
    </form>
  );
}
