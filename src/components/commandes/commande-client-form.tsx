"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { ActionIcon, Button, Card, Group, SimpleGrid, Stack, Select, Text } from "@mantine/core";
import { LignesEditor, type ArticleCatalogue } from "@/components/commandes/lignes-editor";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { creerClient } from "@/app/(dashboard)/clients/actions";
import { creerCommandeClient } from "@/app/(dashboard)/commandes-client/actions";
import { formatMontant } from "@/lib/format";
import { ChampDate } from "@/components/shared/champ-date";

type ClientOption = { id: number; nom: string; prenom: string | null; raisonSociale: string | null };

function nomAffiche(c: ClientOption) {
  return c.raisonSociale ?? (c.prenom ? `${c.nom} ${c.prenom}` : c.nom);
}

export function CommandeClientForm({
  clients,
  articles,
}: {
  clients: ClientOption[];
  articles: ArticleCatalogue[];
}) {
  const [state, formAction, pending] = useActionState(creerCommandeClient, {
    error: null,
    success: false,
  });
  const [listeClients, setListeClients] = useState<ClientOption[]>(clients);
  const [clientId, setClientId] = useState<string>("");
  const [total, setTotal] = useState(0);

  return (
    <form action={formAction} className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:items-start">
      <div className="min-w-0 space-y-6">
        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Informations de la vente</Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Group gap="xs" align="flex-end">
              <Select
                label="Client"
                name="clientId"
                value={clientId}
                onChange={(v) => setClientId(v ?? "")}
                required
                searchable
                placeholder="Choisir un client..."
                data={listeClients.map((c) => ({ value: String(c.id), label: nomAffiche(c) }))}
                className="flex-1"
              />
              <ClientFormDialog
                action={creerClient}
                onCreated={(c) => {
                  setListeClients((prev) => [...prev, c]);
                  setClientId(String(c.id));
                }}
                trigger={
                  <ActionIcon type="button" variant="default" size="lg" aria-label="Nouveau client">
                    <Plus size={16} />
                  </ActionIcon>
                }
              />
            </Group>
            <ChampDate label="Date de commande" name="dateCommande" required w="100%" defaultValue={new Date().toISOString().slice(0, 10)} maxDate={new Date().toISOString().slice(0, 10)} />
            <Select
              label="Mode de règlement"
              name="modeReglement"
              defaultValue="ESPECES"
              required
              data={[
                { value: "ESPECES", label: "Espèces (comptant)" },
                { value: "BON_DE_COMMANDE", label: "À crédit" },
              ]}
            />
          </SimpleGrid>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Articles</Text>
          <LignesEditor name="lignes" articles={articles} champPrix="vente" onTotalChange={setTotal} />
        </Card>
      </div>

      <div className="2xl:sticky 2xl:top-[6.5rem]">
        <Card withBorder radius="md" padding="lg">
          <Text fw={600} mb="md">Récapitulatif</Text>
          <Stack gap="md">
            <Group justify="space-between" align="baseline" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }} pt="md">
              <Text size="sm" c="dimmed">Total de la vente</Text>
              <Text className="font-mono" size="xl" fw={600}>{formatMontant(total)}</Text>
            </Group>

            {state.error && <Text size="sm" c="red">{state.error}</Text>}

            <Button type="submit" loading={pending} fullWidth>
              Créer la vente
            </Button>
          </Stack>
        </Card>
      </div>
    </form>
  );
}
