"use client";

import { Group, NumberInput, Radio, Stack, Text } from "@mantine/core";
import { formatMontant } from "@/lib/format";
import { decomposerTva, formatTaux } from "@/lib/tva";

/**
 * Lit la valeur d'un champ de taux. `NumberInput` renvoie un nombre, ou une
 * chaîne quand la saisie est vide ou en cours (« 19, »). Une valeur
 * inexploitable vaut `null` : l'aperçu l'ignore et le serveur la refusera.
 */
export function lireTaux(valeur: string | number): number | null {
  if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : null;
  const n = Number(valeur.trim().replace(",", "."));
  return valeur.trim() !== "" && Number.isFinite(n) ? n : null;
}

/**
 * Choix du régime de TVA et du taux appliqué, commun à la facture et à la
 * proforma.
 *
 * Le taux est un vrai champ, pré-rempli mais modifiable : auparavant, seul le
 * régime était transmis et le serveur appliquait toujours le taux standard,
 * si bien qu'un 19,25 % saisi ailleurs ressortait en 19,5 % sur le document.
 *
 * Le taux part au serveur dans un champ caché, avec un point décimal : ce qui
 * est envoyé ne dépend ainsi ni de la virgule affichée ni de la locale.
 */
export function RegimeTvaFields({
  exonere,
  onExonereChange,
  taux,
  onTauxChange,
  libelleDocument,
}: {
  exonere: boolean;
  onExonereChange: (exonere: boolean) => void;
  taux: string | number;
  onTauxChange: (taux: string | number) => void;
  /** « facture » ou « proforma », pour les libellés. */
  libelleDocument: string;
}) {
  const tauxLu = lireTaux(taux);

  return (
    <>
      <input type="hidden" name="regimeTva" value={exonere ? "EXONERE" : "ASSUJETTI"} />
      <input type="hidden" name="tauxTva" value={exonere ? "0" : tauxLu === null ? "" : String(tauxLu)} />

      <Radio.Group
        label="TVA"
        value={exonere ? "EXONERE" : "ASSUJETTI"}
        onChange={(v) => onExonereChange(v === "EXONERE")}
      >
        <Stack gap="xs" mt="xs">
          <Radio.Card value="ASSUJETTI" radius="md" p="sm">
            <Group wrap="nowrap" align="flex-start" gap="sm">
              <Radio.Indicator mt={2} />
              <div>
                <Text size="sm" fw={500}>Soumise à la TVA</Text>
                <Text size="xs" c="dimmed">
                  {tauxLu !== null ? formatTaux(tauxLu) : "Le taux saisi"} ajoutés au montant hors taxe.
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
                  Aucune TVA sur cette {libelleDocument}. Le client paie le montant hors taxe.
                </Text>
              </div>
            </Group>
          </Radio.Card>
        </Stack>
      </Radio.Group>

      {!exonere && (
        <NumberInput
          label="Taux de TVA (%)"
          description="Deux décimales possibles, par exemple 19,25."
          value={taux}
          onChange={onTauxChange}
          min={0}
          max={100}
          decimalScale={2}
          decimalSeparator=","
          allowNegative={false}
          required
          error={tauxLu === null ? "Indiquez un taux" : undefined}
        />
      )}
    </>
  );
}

/** Récapitulatif HT / TVA / TTC, recalculé à chaque frappe. */
export function RecapitulatifTva({
  montantHt,
  exonere,
  taux,
}: {
  montantHt: number;
  exonere: boolean;
  taux: string | number;
}) {
  const totaux = decomposerTva(montantHt, { exonere, taux: lireTaux(taux) ?? 0 });

  return (
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
  );
}
