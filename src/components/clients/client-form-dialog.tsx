"use client";

import { cloneElement, useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import type { EtatFormulaire } from "@/app/(dashboard)/clients/actions";

type Client = {
  id: number;
  nom: string;
  prenom: string | null;
  raisonSociale: string | null;
  telephone: string;
  email: string | null;
  adresse: string | null;
  nif: string | null;
};

export function ClientFormDialog({
  action,
  client,
  trigger,
  onCreated,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  client?: Client;
  trigger?: React.ReactElement;
  onCreated?: (client: { id: number; nom: string; prenom: string | null; raisonSociale: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({
        message: client ? "Client modifié" : "Client créé",
        color: "green",
      });
      if (!client && state.client) {
        onCreated?.(state.client);
      }
    }
  }, [state, client, onCreated]);

  const triggerNode = trigger ?? <Button>Nouveau client</Button>;

  return (
    <>
      {cloneElement(triggerNode, { onClick: () => setOpen(true) })}
      <Modal opened={open} onClose={() => setOpen(false)} title={client ? "Modifier le client" : "Nouveau client"}>
        <form action={formAction}>
          <Stack gap="md">
            <SimpleGrid cols={2}>
              <TextInput label="Nom" name="nom" required defaultValue={client?.nom} />
              <TextInput label="Prénom" name="prenom" defaultValue={client?.prenom ?? ""} />
            </SimpleGrid>
            <TextInput label="Raison sociale" name="raisonSociale" defaultValue={client?.raisonSociale ?? ""} />
            <TextInput label="Téléphone" name="telephone" required defaultValue={client?.telephone} />
            <TextInput label="Email" name="email" type="email" defaultValue={client?.email ?? ""} />
            <TextInput label="Adresse" name="adresse" defaultValue={client?.adresse ?? ""} />
            <TextInput label="NIF" name="nif" defaultValue={client?.nif ?? ""} />
            {state.error && (
              <Text c="red" size="sm">
                {state.error}
              </Text>
            )}
            <Group justify="flex-end">
              <Button type="submit" loading={pending}>
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
