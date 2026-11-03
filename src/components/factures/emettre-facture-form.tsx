"use client";

import { useActionState, useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { RecapitulatifTva, RegimeTvaFields } from "@/components/documents/regime-tva-fields";
import { emettreFacture } from "@/app/(dashboard)/factures/actions";

/**
 * Le régime de TVA est un choix explicite fait au moment d'émettre : tous les
 * clients n'y sont pas assujettis, et le montant réclamé en dépend. La fiche
 * client ne fait que positionner la valeur par défaut, modifiable ici au cas
 * par cas — de même que le taux, pré-rempli et modifiable.
 */
export function EmettreFactureForm({
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
  const [state, formAction, pending] = useActionState(emettreFacture, {
    error: null,
    success: false,
  });
  const [exonere, setExonere] = useState(exonerePartDefaut);
  const [taux, setTaux] = useState<string | number>(tauxParDefaut);

  return (
    <form action={formAction}>
      <Stack gap="md">
        <input type="hidden" name="commandeClientId" value={commandeClientId} />

        <RegimeTvaFields
          exonere={exonere}
          onExonereChange={setExonere}
          taux={taux}
          onTauxChange={setTaux}
          libelleDocument="facture"
        />

        <RecapitulatifTva montantHt={montantHt} exonere={exonere} taux={taux} />

        {state.error && <Text size="sm" c="red">{state.error}</Text>}

        <Button type="submit" loading={pending} fullWidth>
          {pending ? "Émission..." : "Émettre la facture"}
        </Button>
      </Stack>
    </form>
  );
}
