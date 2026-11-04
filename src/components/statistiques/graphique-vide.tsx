import { Stack, Text, ThemeIcon } from "@mantine/core";
import { ChartNoAxesColumn } from "lucide-react";

/**
 * Remplace un graphique sans aucune donnée : un axe gradué de 0 à 4 FCFA
 * n'apprend rien et laisse croire à un dysfonctionnement.
 */
export function GraphiqueVide({ message, hauteur = 224 }: { message: string; hauteur?: number }) {
  return (
    <Stack
      align="center"
      justify="center"
      gap="xs"
      h={hauteur}
      style={{ border: "1px dashed var(--aei-bordure)", borderRadius: "var(--mantine-radius-md)" }}
    >
      <ThemeIcon variant="light" color="gray" size={44} radius="xl">
        <ChartNoAxesColumn size={22} />
      </ThemeIcon>
      <Text size="sm" c="dimmed" ta="center" maw={280}>
        {message}
      </Text>
    </Stack>
  );
}
