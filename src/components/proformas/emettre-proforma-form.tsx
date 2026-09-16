"use client";

import { useActionState, useState } from "react";
import { Button, Group, NumberInput, Radio, Stack, Text } from "@mantine/core";
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
  const [validiteJours, setValiditeJours] = useState<string | number>(VALIDITE_PAR_DEFAUT);

  const totaux = decomposerTva(montantHt, { exonere });

  // Aperçu de l'échéance : le client doit voir, avant de valider, jusqu'à
  // quelle date le prix annoncé l'engage.
  const jours = Number(validiteJours);
  const echeance =
    Number.isInteger(jours) && jours >= 1 && jours <= 365
      ? new Date(Date.now() + jours * 24 * 60 * 60 * 1000)
      : null;

  return (
    <form action={formAction}>
      <Stack gap="md">
        <input type="hidden" name="commandeClientId" value={commandeClientId} />
        <input type="hidden" name="regimeTva" value={exonere ? "EXONERE" : "ASSUJETTI"} />

        <Radio.Group
          label="TVA"
          value={exonere ? "EXONERE" : "ASSUJETTI"}
          onChange={(v) => setExonere(v === "EXONERE")}
        >
          <Stack gap="xs" mt="xs">
            <Radio.Card value="ASSUJETTI" radius="md" p="sm">
              <Group wrap="nowrap" align="flex-start" gap="sm">
                <Radio.Indicator mt={2} />
                <div>
                  <Text size="sm" fw={500}>Soumise à la TVA</Text>
                  <Text size="xs" c="dimmed">
                    {formatTaux(TAUX_TVA_STANDARD)} ajoutés au montant hors taxe.
                  </Text>
                </div>
              </Group>
            </Radio.Card>

            <Radio.Card value="EXONERE" radius="md" p="sm">
              <Group wrap="nowrap" align="flex-start" gap="sm">
                <Radio.Indicator mt={2} />
                <div>
                  <Text size="sm" fw={500}>Exonérée</Text>
                  <Text size="xs" c="dimmed">
                    Aucune TVA annoncée. Le client paiera le montant hors taxe.
                  </Text>
                </div>
              </Group>
            </Radio.Card>
          </Stack>
        </Radio.Group>

        <NumberInput
          label="Validité de l'offre (jours)"
          name="validiteJours"
          min={1}
          max={365}
          required
          value={validiteJours}
          onChange={setValiditeJours}
          description={
            echeance
              ? `Le prix annoncé engage AEI jusqu'au ${formatDate(echeance)}.`
              : "Indiquez un nombre de jours entre 1 et 365."
          }
        />

        <Stack gap={6} pt="md" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Total HT</Text>
            <Text size="sm" className="font-mono tabular-nums">{formatMontant(totaux.montantHt)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              TVA {totaux.exonereTva ? "(exonérée)" : `(${formatTaux(totaux.tauxTva)})`}
            </Text>
            <Text size="sm" className="font-mono tabular-nums">{formatMontant(totaux.montantTva)}</Text>
          </Group>
          <Group justify="space-between" pt="xs" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
            <Text size="sm" fw={500}>Total TTC</Text>
            <Text size="xl" fw={600} className="font-mono tabular-nums">
              {formatMontant(totaux.montantTotal)}
            </Text>
          </Group>
        </Stack>

        {state.error && <Text size="sm" c="red">{state.error}</Text>}

        <Button type="submit" loading={pending} fullWidth>
          {pending ? "Établissement..." : "Établir la proforma"}
        </Button>
      </Stack>
    </form>
  );
}
