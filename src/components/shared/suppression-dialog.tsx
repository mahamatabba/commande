"use client";

import { useActionState, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { notifications } from "@mantine/notifications";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Confirmation d'une suppression définitive (facture ou proforma annulée,
 * compte utilisateur). L'action serveur revérifie toujours la permission et
 * l'état de l'élément : ce dialogue n'est qu'un garde-fou contre le clic
 * accidentel.
 */
export function SuppressionDialog({
  action,
  titre,
  description,
  libelleBouton = "Supprimer",
  variant = "light",
  messageSucces = "Suppression effectuée",
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  titre: string;
  description: React.ReactNode;
  libelleBouton?: string;
  variant?: "light" | "filled" | "subtle";
  messageSucces?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({ message: messageSucces, color: "green" });
    }
  }, [state, messageSucces]);

  return (
    <>
      <Button
        color="red"
        variant={variant}
        leftSection={<Trash2 size={16} />}
        onClick={() => setOpen(true)}
      >
        {libelleBouton}
      </Button>
      <Modal opened={open} onClose={() => setOpen(false)} title={titre} centered>
        <form action={formAction}>
          <Stack gap="md">
            <Alert color="red" variant="light">
              <Text size="sm">{description}</Text>
            </Alert>
            <Text size="sm" fw={500}>Cette suppression est définitive.</Text>
            {state.error && (
              <Text c="red" size="sm">
                {state.error}
              </Text>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" color="red" loading={pending}>
                Supprimer définitivement
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
