"use client";

import { useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, PasswordInput, Stack, Text } from "@mantine/core";
import { reinitialiserMotDePasse } from "@/app/(dashboard)/utilisateurs/actions";

export function ReinitialiserMotDePasseDialog({ id, nom }: { id: number; nom: string }) {
  const [open, setOpen] = useState(false);
  const action = reinitialiserMotDePasse.bind(null, id);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({ message: "Mot de passe réinitialisé", color: "green" });
    }
  }, [state]);

  return (
    <>
      <Button variant="subtle" size="sm" onClick={() => setOpen(true)}>
        Mot de passe
      </Button>
      <Modal opened={open} onClose={() => setOpen(false)} title={`Réinitialiser le mot de passe de ${nom}`}>
        <form action={formAction}>
          <Stack gap="md">
            <PasswordInput label="Nouveau mot de passe" name="motDePasse" required minLength={8} />
            {state.error && (
              <Text c="red" size="sm">
                {state.error}
              </Text>
            )}
            <Group justify="flex-end">
              <Button type="submit" loading={pending}>
                Réinitialiser
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
