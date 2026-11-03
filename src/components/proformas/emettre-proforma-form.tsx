"use client";

import { useActionState, useState } from "react";
import { Button, NumberInput, Stack, Text, TextInput } from "@mantine/core";
import { formatDate } from "@/lib/format";
import { RecapitulatifTva, RegimeTvaFields } from "@/components/documents/regime-tva-fields";
import { emettreProforma } from "@/app/(dashboard)/proformas/actions";

export const VALIDITE_PAR_DEFAUT = 30;

/**
 * Conditions commerciales imprimées sur la proforma : durée de validité de
 * l'offre, délai de livraison et garantie. Partagées entre l'établissement
 * et la modification d'une proforma.
 */
export function ConditionsProformaFields({
  validiteJours,
  onValiditeChange,
  delaiLivraison,
  garantie,
  depuis = new Date(),
}: {
  validiteJours: string | number;
  onValiditeChange: (v: string | number) => void;
  delaiLivraison?: string | null;
  garantie?: string | null;
  /** Date à partir de laquelle la validité court (date de la proforma). */
  depuis?: Date;
}) {
  // Aperçu de l'échéance : le client doit voir, avant de valider, jusqu'à
  // quelle date le prix annoncé l'engage.
  const jours = Number(validiteJours);
  const echeance =
    Number.isInteger(jours) && jours >= 1 && jours <= 365
      ? new Date(depuis.getTime() + jours * 24 * 60 * 60 * 1000)
      : null;

  return (
    <>
      <NumberInput
        label="Validité de l'offre (jours)"
        name="validiteJours"
        min={1}
        max={365}
        required
        value={validiteJours}
        onChange={onValiditeChange}
        description={
          echeance
            ? `Le prix annoncé engage AEI jusqu'au ${formatDate(echeance)}.`
            : "Indiquez un nombre de jours entre 1 et 365."
        }
      />
      <TextInput
        label="Délai de livraison"
        name="delaiLivraison"
        placeholder="Ex. : 15 jours après réception du bon de commande"
        maxLength={255}
        defaultValue={delaiLivraison ?? ""}
      />
      <TextInput
        label="Garantie"
        name="garantie"
        placeholder="Ex. : 12 mois pièces et main-d'œuvre"
        maxLength={255}
        defaultValue={garantie ?? ""}
      />
    </>
  );
}

/**
 * Même choix de régime et de taux de TVA que pour une facture — le montant
 * annoncé au client en dépend — auxquels s'ajoutent les conditions de l'offre
 * (validité, délai de livraison, garantie), imprimées sur le document.
 */
export function EmettreProformaForm({
  commandeClientId,
  montantHt,
  exonerePartDefaut,
  tauxParDefaut,
}: {
  commandeClientId: number;
  montantHt: number;
  exonerePartDefaut: boolean;
  tauxParDefaut: number;
}) {
  const [state, formAction, pending] = useActionState(emettreProforma, {
    error: null,
    success: false,
  });
  const [exonere, setExonere] = useState(exonerePartDefaut);
  const [taux, setTaux] = useState<string | number>(tauxParDefaut);
  const [validiteJours, setValiditeJours] = useState<string | number>(VALIDITE_PAR_DEFAUT);

  return (
    <form action={formAction}>
      <Stack gap="md">
        <input type="hidden" name="commandeClientId" value={commandeClientId} />

        <RegimeTvaFields
          exonere={exonere}
          onExonereChange={setExonere}
          taux={taux}
          onTauxChange={setTaux}
          libelleDocument="proforma"
        />

        <ConditionsProformaFields validiteJours={validiteJours} onValiditeChange={setValiditeJours} />

        <RecapitulatifTva montantHt={montantHt} exonere={exonere} taux={taux} />

        {state.error && <Text size="sm" c="red">{state.error}</Text>}

        <Button type="submit" loading={pending} fullWidth>
          {pending ? "Établissement..." : "Établir la proforma"}
        </Button>
      </Stack>
    </form>
  );
}
