"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { ActionIcon, Button, Card, Group, SimpleGrid, Stack, Select, Text, TextInput } from "@mantine/core";
import { LignesEditor, type ArticleCatalogue } from "@/components/commandes/lignes-editor";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { creerFournisseur } from "@/app/(dashboard)/fournisseurs/actions";
import { creerCommandeFournisseur } from "@/app/(dashboard)/commandes-fournisseur/actions";
import { formatMontant } from "@/lib/format";

type FournisseurOption = { id: number; nom: string };

export function CommandeFournisseurForm({
  fournisseurs,
  articles,
}: {
  fournisseurs: FournisseurOption[];
  articles: ArticleCatalogue[];
}) {
  const [state, formAction, pending] = useActionState(creerCommandeFournisseur, {
    error: null,
    success: false,
  });
  const [listeFournisseurs, setListeFournisseurs] = useState<FournisseurOption[]>(fournisseurs);
  const [fournisseurId, setFournisseurId] = useState<string>("");
  const [total, setTotal] = useState(0);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="space-y-6 lg:col-span-2">
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
            <TextInput
              label="Date de commande"
              name="dateCommande"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </SimpleGrid>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Articles</Text>
          <LignesEditor name="lignes" articles={articles} champPrix="achat" onTotalChange={setTotal} />
        </Card>
      </div>

      <div className="lg:sticky lg:top-6">
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
