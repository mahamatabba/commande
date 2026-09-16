"use client";

import { useActionState, useState } from "react";
import { Button, Group, Radio, Stack, Text } from "@mantine/core";
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
                    Aucune TVA facturée. Le client paie le montant hors taxe.
                  </Text>
                </div>
              </Group>
            </Radio.Card>
          </Stack>
        </Radio.Group>

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
          {pending ? "Émission..." : "Émettre la facture"}
        </Button>
      </Stack>
    </form>
  );
}
