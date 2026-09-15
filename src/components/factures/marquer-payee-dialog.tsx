"use client";

import { useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, SimpleGrid, Stack, Select, Text, Textarea, TextInput } from "@mantine/core";
import { formatMontant } from "@/lib/format";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Passage rapide d'une facture à « Payée » depuis son propre écran, sans
 * passer par la liste des règlements.
 *
 * Le formulaire demande tout de même le moyen et la date, parce que cette
 * action enregistre un vrai encaissement qui entre en caisse : le raccourci
 * porte sur le nombre de clics, jamais sur la traçabilité.
 */
export function MarquerPayeeDialog({
  action,
  resteAPayer,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  resteAPayer: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({ message: "Facture soldée", color: "green" });
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Marquer payée</Button>
      <Modal opened={open} onClose={() => setOpen(false)} title="Marquer la facture payée">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Un encaissement de {formatMontant(resteAPayer)} sera enregistré et entrera en caisse. La
            facture passera au statut « Soldée ».
          </Text>
          <form action={formAction}>
            <Stack gap="md">
              <SimpleGrid cols={2}>
                <TextInput
                  label="Date du règlement"
                  name="dateReglement"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
                <Select
                  label="Moyen"
                  name="moyen"
                  defaultValue="ESPECES"
                  required
                  data={[
                    { value: "ESPECES", label: "Espèces" },
                    { value: "VIREMENT", label: "Virement" },
                    { value: "MOBILE_MONEY", label: "Mobile Money" },
                  ]}
                />
              </SimpleGrid>
              <Textarea label="Commentaire" name="commentaire" rows={2} />
              {state.error && (
                <Text c="red" size="sm">
                  {state.error}
                </Text>
              )}
              <Group justify="flex-end">
                <Button type="submit" loading={pending}>
                  Encaisser {formatMontant(resteAPayer)}
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </>
  );
}
