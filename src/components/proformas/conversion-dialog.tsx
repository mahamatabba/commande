"use client";

import { useActionState, useState } from "react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { formatMontant } from "@/lib/format";
import type { EtatFormulaire } from "@/lib/action-state";

/**
 * Confirmation avant de transformer une proforma en facture définitive.
 *
 * La conversion n'est pas anodine : elle crée la créance, passe la vente au
 * statut « Facturée » et, pour une vente au comptant, enregistre
 * immédiatement l'encaissement en caisse. L'écran l'annonce donc avant, pas
 * après. En cas de succès l'action redirige vers la facture créée : il n'y a
 * rien à refermer ici.
 */
export function ConversionProformaDialog({
  action,
  montantTotal,
  auComptant,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  montantTotal: number;
  auComptant: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>Convertir en facture</Button>
      <Modal opened={open} onClose={() => setOpen(false)} title="Convertir en facture définitive">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Une facture de {formatMontant(montantTotal)} sera émise et numérotée, et la vente passera
            au statut « Facturée ».
            {auComptant
              ? " Cette vente étant au comptant, l'encaissement du montant total sera enregistré en caisse dans la foulée."
              : " La facture sera émise en « Non payée » : les règlements se saisissent ensuite."}
          </Text>
          <form action={formAction}>
            <Stack gap="md">
              {state.error && (
                <Text c="red" size="sm">
                  {state.error}
                </Text>
              )}
              <Group justify="flex-end">
                <Button type="submit" loading={pending}>
                  Confirmer la conversion
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </>
  );
}
