"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { LignesEditor, type ArticleCatalogue } from "@/components/commandes/lignes-editor";
import { RecapitulatifTva, RegimeTvaFields } from "@/components/documents/regime-tva-fields";
import { ConditionsProformaFields } from "@/components/proformas/emettre-proforma-form";
import { modifierProforma } from "@/app/(dashboard)/proformas/actions";
import type { LigneInput } from "@/lib/validations";

/**
 * Modification d'une proforma en circulation : lignes (prix, quantités,
 * articles), régime et taux de TVA, validité, délai de livraison, garantie.
 */
export function ModifierProformaForm({
  proformaId,
  articles,
  lignesInitiales,
  exonereInitial,
  tauxInitial,
  validiteInitiale,
  delaiLivraison,
  garantie,
  dateProforma,
}: {
  proformaId: number;
  articles: ArticleCatalogue[];
  lignesInitiales: LigneInput[];
  exonereInitial: boolean;
  tauxInitial: number;
  validiteInitiale: number;
  delaiLivraison: string | null;
  garantie: string | null;
  dateProforma: Date;
}) {
  const [state, formAction, pending] = useActionState(modifierProforma.bind(null, proformaId), {
    error: null,
    success: false,
  });
  const [exonere, setExonere] = useState(exonereInitial);
  const [taux, setTaux] = useState<string | number>(tauxInitial);
  const [validiteJours, setValiditeJours] = useState<string | number>(validiteInitiale);
  const [montantHt, setMontantHt] = useState(
    lignesInitiales.reduce((s, l) => s + Math.round(l.quantite * l.prixUnitaire), 0),
  );

  return (
    <form action={formAction}>
      <Stack gap="lg">
        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Lignes chiffrées</Text>
          <LignesEditor
            name="lignes"
            articles={articles}
            lignesInitiales={lignesInitiales}
            champPrix="vente"
            onTotalChange={setMontantHt}
          />
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Conditions et TVA</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Stack gap="md">
              <RegimeTvaFields
                exonere={exonere}
                onExonereChange={setExonere}
                taux={taux}
                onTauxChange={setTaux}
                libelleDocument="proforma"
              />
            </Stack>
            <Stack gap="md">
              <ConditionsProformaFields
                validiteJours={validiteJours}
                onValiditeChange={setValiditeJours}
                delaiLivraison={delaiLivraison}
                garantie={garantie}
                depuis={dateProforma}
              />
            </Stack>
          </SimpleGrid>

          <Stack gap="md" mt="lg" maw={520} ml="auto">
            <RecapitulatifTva montantHt={montantHt} exonere={exonere} taux={taux} />

            {state.error && <Text size="sm" c="red">{state.error}</Text>}

            <Group grow>
              <Button variant="default" component={Link} href={`/proformas/${proformaId}`}>
                Annuler
              </Button>
              <Button type="submit" loading={pending}>
                Enregistrer les modifications
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </form>
  );
}
