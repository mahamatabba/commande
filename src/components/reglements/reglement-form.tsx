"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { formatMontant } from "@/lib/format";
import { saisirReglement } from "@/app/(dashboard)/reglements/actions";

export type FactureEligible = { id: number; numero: string; nomAffiche: string; resteAPayer: number };
export type CommandeFournisseurEligible = {
  id: number;
  numero: string;
  fournisseurNom: string;
  resteAPayer: number;
};

export function ReglementForm({
  factures,
  commandes,
}: {
  factures: FactureEligible[];
  commandes: CommandeFournisseurEligible[];
}) {
  const [open, setOpen] = useState(false);
  const [cible, setCible] = useState<"facture" | "commande_fournisseur">("facture");
  const [cibleId, setCibleId] = useState<string>("");
  const [state, formAction, pending] = useActionState(saisirReglement, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setCibleId("");
      notifications.show({ message: "Règlement enregistré", color: "green" });
    }
  }, [state]);

  const cibleActuelle = cible === "facture" ? factures : commandes;
  const resteAPayer = useMemo(() => {
    const item = cibleActuelle.find((c) => String(c.id) === cibleId);
    return item?.resteAPayer ?? null;
  }, [cibleActuelle, cibleId]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nouveau règlement</Button>
      <Modal
        opened={open}
        onClose={() => {
          setOpen(false);
          setCibleId("");
        }}
        title="Nouveau règlement"
      >
        <form action={formAction}>
          <Stack gap="md">
            <Select
              label="Type"
              name="cible"
              value={cible}
              onChange={(v) => {
                setCible(v as "facture" | "commande_fournisseur");
                setCibleId("");
              }}
              required
              data={[
                { value: "facture", label: "Encaissement — Facture client" },
                { value: "commande_fournisseur", label: "Décaissement — Achat fournisseur" },
              ]}
            />

            <Select
              label={cible === "facture" ? "Facture" : "Achat fournisseur"}
              name="cibleId"
              value={cibleId}
              onChange={(v) => setCibleId(v ?? "")}
              required
              placeholder="Choisir..."
              data={
                cible === "facture"
                  ? factures.map((f) => ({
                      value: String(f.id),
                      label: `${f.numero} — ${f.nomAffiche} (reste ${formatMontant(f.resteAPayer)})`,
                    }))
                  : commandes.map((c) => ({
                      value: String(c.id),
                      label: `${c.numero} — ${c.fournisseurNom} (reste ${formatMontant(c.resteAPayer)})`,
                    }))
              }
            />

            <SimpleGrid cols={2}>
              <Stack gap={4}>
                <TextInput
                  label="Montant (FCFA)"
                  name="montant"
                  type="number"
                  min={1}
                  max={resteAPayer ?? undefined}
                  required
                />
                {resteAPayer !== null && (
                  <Text size="xs" c="dimmed">
                    Reste à payer : {formatMontant(resteAPayer)}
                  </Text>
                )}
              </Stack>
              <TextInput
                label="Date"
                name="dateReglement"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </SimpleGrid>

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

            <Textarea label="Commentaire" name="commentaire" rows={2} />

            {state.error && (
              <Text c="red" size="sm">
                {state.error}
              </Text>
            )}

            <Group justify="flex-end">
              <Button type="submit" loading={pending} disabled={!cibleId}>
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
