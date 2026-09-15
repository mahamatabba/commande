"use client";

import { cloneElement, useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import type { EtatFormulaire } from "@/app/(dashboard)/fournisseurs/actions";

type Fournisseur = {
  id: number;
  nom: string;
  adresse: string | null;
  telephone: string;
  email: string | null;
  nif: string | null;
};

export function FournisseurFormDialog({
  action,
  fournisseur,
  trigger,
  onCreated,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  fournisseur?: Fournisseur;
  trigger?: React.ReactElement;
  onCreated?: (fournisseur: { id: number; nom: string }) => void;
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
        message: fournisseur ? "Fournisseur modifié" : "Fournisseur créé",
        color: "green",
      });
      if (!fournisseur && state.fournisseur) {
        onCreated?.(state.fournisseur);
      }
    }
  }, [state, fournisseur, onCreated]);

  const triggerNode = trigger ?? <Button>Nouveau fournisseur</Button>;

  return (
    <>
      {cloneElement(triggerNode, { onClick: () => setOpen(true) })}
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={fournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}
      >
        <form action={formAction}>
          <Stack gap="md">
            <TextInput label="Nom" name="nom" required defaultValue={fournisseur?.nom} />
            <TextInput label="Téléphone" name="telephone" required defaultValue={fournisseur?.telephone} />
            <TextInput label="Adresse" name="adresse" defaultValue={fournisseur?.adresse ?? ""} />
            <TextInput label="Email" name="email" type="email" defaultValue={fournisseur?.email ?? ""} />
            <TextInput label="NIF" name="nif" defaultValue={fournisseur?.nif ?? ""} />
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
