"use client";

import { useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, PasswordInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { creerUtilisateur } from "@/app/(dashboard)/utilisateurs/actions";

export function UtilisateurCreationDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("AGENT");
  const [state, formAction, pending] = useActionState(creerUtilisateur, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({ message: "Utilisateur créé", color: "green" });
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nouvel utilisateur</Button>
      <Modal opened={open} onClose={() => setOpen(false)} title="Nouvel utilisateur">
        <form action={formAction}>
          <Stack gap="md">
            <TextInput label="Nom complet" name="nomComplet" required />
            <TextInput label="Email" name="email" type="email" required />
            <Select
              label="Rôle"
              name="role"
              value={role}
              onChange={(v) => setRole(v ?? "AGENT")}
              required
              data={[
                { value: "AGENT", label: "Agent" },
                { value: "SUPERVISEUR", label: "Superviseur" },
                { value: "ADMIN", label: "Administrateur" },
              ]}
            />
            <PasswordInput label="Mot de passe" name="motDePasse" required minLength={8} />
            {state.error && (
              <Text c="red" size="sm">
                {state.error}
              </Text>
            )}
            <Group justify="flex-end">
              <Button type="submit" loading={pending}>
                Créer
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
