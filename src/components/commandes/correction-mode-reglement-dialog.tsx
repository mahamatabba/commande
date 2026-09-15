"use client";

import { useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Réservé à l'admin (`requirePermission(session, "commandes_client:corriger")`
 * côté serveur) : permet de corriger le mode de règlement d'une commande déjà
 * saisie par un agent (ex : enregistrée à tort en espèces alors qu'elle est à
 * crédit).
 */
export function CorrectionModeReglementDialog({
  action,
  modeReglementActuel,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  modeReglementActuel: "ESPECES" | "BON_DE_COMMANDE";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({ message: "Mode de règlement corrigé", color: "green" });
    }
  }, [state]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Corriger
      </Button>
      <Modal opened={open} onClose={() => setOpen(false)} title="Corriger le mode de règlement">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            À utiliser uniquement pour corriger une erreur de saisie. Cette action est tracée.
          </Text>
          <form action={formAction}>
            <Stack gap="md">
              <Select
                label="Mode de règlement"
                name="modeReglement"
                defaultValue={modeReglementActuel}
                required
                data={[
                  { value: "ESPECES", label: "Espèces (comptant)" },
                  { value: "BON_DE_COMMANDE", label: "Bon de commande (à crédit)" },
                ]}
              />
              {state.error && (
                <Text c="red" size="sm">
                  {state.error}
                </Text>
              )}
              <Group justify="flex-end">
                <Button type="submit" loading={pending}>
                  Enregistrer la correction
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </>
  );
}
