"use client";

import { useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Dialogue générique pour toute annulation (commande fournisseur, commande
 * client, facture, règlement) — le motif est toujours obligatoire et l'action
 * est toujours réservée à l'admin (vérifié côté serveur par
 * `requirePermission(session, "annulation:effectuer")`).
 */
export function AnnulationDialog({
  action,
  titre = "Annuler",
  description = "Cette action est définitive et sera tracée. Le motif est obligatoire.",
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  titre?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({ message: "Annulation effectuée", color: "green" });
    }
  }, [state]);

  return (
    <>
      <Button color="red" onClick={() => setOpen(true)}>
        {titre}
      </Button>
      <Modal opened={open} onClose={() => setOpen(false)} title={titre}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {description}
          </Text>
          <form action={formAction}>
            <Stack gap="md">
              <Textarea label="Motif" name="motif" required minLength={3} rows={3} />
              {state.error && (
                <Text c="red" size="sm">
                  {state.error}
                </Text>
              )}
              <Group justify="flex-end">
                <Button type="submit" color="red" loading={pending}>
                  Confirmer l&apos;annulation
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </>
  );
}
