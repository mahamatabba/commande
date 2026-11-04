"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { ActionIcon, Button, Card, Group, SimpleGrid, Stack, Select, Text } from "@mantine/core";
import { LignesEditor, type ArticleCatalogue } from "@/components/commandes/lignes-editor";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { creerFournisseur } from "@/app/(dashboard)/fournisseurs/actions";
import { creerCommandeFournisseur } from "@/app/(dashboard)/commandes-fournisseur/actions";
import { formatMontant } from "@/lib/format";
import { ChampDate } from "@/components/shared/champ-date";
import type { LigneInput } from "@/lib/validations";

type FournisseurOption = { id: number; nom: string };

export function CommandeFournisseurForm({
  fournisseurs,
  articles,
  modele,
}: {
  fournisseurs: FournisseurOption[];
  articles: ArticleCatalogue[];
  /** Bon de commande dupliqué : fournisseur et lignes pré-remplis. */
  modele?: { fournisseurId: number; lignes: LigneInput[] };
}) {
  const [state, formAction, pending] = useActionState(creerCommandeFournisseur, {
    error: null,
    success: false,
  });
  const [listeFournisseurs, setListeFournisseurs] = useState<FournisseurOption[]>(fournisseurs);
  const [fournisseurId, setFournisseurId] = useState<string>(modele ? String(modele.fournisseurId) : "");
  const [total, setTotal] = useState(
    modele ? modele.lignes.reduce((t, l) => t + Math.round(l.quantite * l.prixUnitaire), 0) : 0,
  );

  return (
    <form action={formAction} className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:items-start">
      <div className="min-w-0 space-y-6">
        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Informations de l&apos;achat</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Group gap="xs" align="flex-end">
              <Select
                label="Fournisseur"
                name="fournisseurId"
                value={fournisseurId}
                onChange={(v) => setFournisseurId(v ?? "")}
                required
                searchable
                placeholder="Choisir un fournisseur..."
                data={listeFournisseurs.map((f) => ({ value: String(f.id), label: f.nom }))}
                className="flex-1"
              />
              <FournisseurFormDialog
                action={creerFournisseur}
                onCreated={(f) => {
                  setListeFournisseurs((prev) => [...prev, f]);
                  setFournisseurId(String(f.id));
                }}
                trigger={
                  <ActionIcon type="button" variant="default" size="lg" aria-label="Nouveau fournisseur">
                    <Plus size={16} />
                  </ActionIcon>
                }
              />
            </Group>
            <ChampDate label="Date de commande" name="dateCommande" required w="100%" defaultValue={new Date().toISOString().slice(0, 10)} maxDate={new Date().toISOString().slice(0, 10)} />
          </SimpleGrid>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Articles</Text>
          <LignesEditor
            name="lignes"
            articles={articles}
            lignesInitiales={modele?.lignes}
            champPrix="achat"
            onTotalChange={setTotal}
          />
        </Card>
      </div>

      <div className="2xl:sticky 2xl:top-[6.5rem]">
        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Récapitulatif</Text>
          <Stack gap="md">
            <Group justify="space-between" align="baseline" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }} pt="md">
              <Text size="sm" c="dimmed">Total de l&apos;achat</Text>
              <Text className="font-mono" size="xl" fw={600}>{formatMontant(total)}</Text>
            </Group>

            {state.error && <Text size="sm" c="red">{state.error}</Text>}

            <Button type="submit" loading={pending} fullWidth>
              Créer l&apos;achat
            </Button>
          </Stack>
        </Card>
      </div>
    </form>
  );
}
