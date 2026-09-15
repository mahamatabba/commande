"use client";

import { useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Checkbox, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { modifierUtilisateur } from "@/app/(dashboard)/utilisateurs/actions";

type Utilisateur = {
  id: number;
  nomComplet: string;
  role: "AGENT" | "SUPERVISEUR" | "ADMIN";
  actif: boolean;
};

export function UtilisateurEditDialog({ utilisateur }: { utilisateur: Utilisateur }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Utilisateur["role"]>(utilisateur.role);
  const action = modifierUtilisateur.bind(null, utilisateur.id);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      notifications.show({ message: "Utilisateur modifié", color: "green" });
    }
  }, [state]);

  return (
    <>
      <Button variant="subtle" size="sm" onClick={() => setOpen(true)}>
        Modifier
      </Button>
      <Modal opened={open} onClose={() => setOpen(false)} title="Modifier l'utilisateur">
        <form action={formAction}>
          <Stack gap="md">
            <TextInput label="Nom complet" name="nomComplet" required defaultValue={utilisateur.nomComplet} />
            <Select
              label="Rôle"
              name="role"
              value={role}
              onChange={(v) => setRole((v ?? "AGENT") as Utilisateur["role"])}
              required
              data={[
                { value: "AGENT", label: "Agent" },
                { value: "SUPERVISEUR", label: "Superviseur" },
                { value: "ADMIN", label: "Administrateur" },
              ]}
            />
            <Checkbox name="actif" label="Compte actif" defaultChecked={utilisateur.actif} />
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
