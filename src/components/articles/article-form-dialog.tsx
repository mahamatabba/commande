"use client";

import { cloneElement, useActionState, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { Button, Group, Modal, NumberInput, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import type { EtatFormulaire } from "@/app/(dashboard)/articles/actions";

type Article = {
  id: number;
  code: string;
  designation: string;
  prixAchatIndicatif: number;
  prixVente: number;
  tauxTva: number;
};

export function ArticleFormDialog({
  action,
  article,
  trigger,
  onCreated,
}: {
  action: (prevState: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  article?: Article;
  trigger?: React.ReactElement;
  onCreated?: (article: {
    id: number;
    code: string;
    designation: string;
    prixAchatIndicatif: number;
    prixVente: number;
  }) => void;
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
        message: article ? "Article modifié" : "Article créé",
        color: "green",
      });
      if (!article && state.article) {
        onCreated?.(state.article);
      }
    }
  }, [state, article, onCreated]);

  const triggerNode = trigger ?? <Button>Nouvel article</Button>;

  return (
    <>
      {cloneElement(triggerNode, { onClick: () => setOpen(true) })}
      <Modal opened={open} onClose={() => setOpen(false)} title={article ? "Modifier l'article" : "Nouvel article"}>
        <form action={formAction}>
          <Stack gap="md">
            <SimpleGrid cols={2}>
              <TextInput label="Code" name="code" required defaultValue={article?.code} />
              <NumberInput
                label="Taux TVA (%)"
                name="tauxTva"
                decimalScale={2}
                defaultValue={article?.tauxTva ?? 18}
              />
            </SimpleGrid>
            <TextInput label="Désignation" name="designation" required defaultValue={article?.designation} />
            <SimpleGrid cols={2}>
              <NumberInput
                label="Prix d'achat indicatif (FCFA)"
                name="prixAchatIndicatif"
                min={0}
                step={1}
                required
                defaultValue={article?.prixAchatIndicatif}
              />
              <NumberInput
                label="Prix de vente (FCFA)"
                name="prixVente"
                min={0}
                step={1}
                required
                defaultValue={article?.prixVente}
              />
            </SimpleGrid>
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
