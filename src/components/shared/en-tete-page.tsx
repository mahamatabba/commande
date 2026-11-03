import { Group, Text, ThemeIcon, Title } from "@mantine/core";
import type { LucideIcon } from "lucide-react";

/**
 * Titre de page commun à tous les écrans : une pastille d'icône, le titre et
 * une phrase d'explication. Les actions de la page restent à côté, dans le
 * `Group` qui l'entoure.
 */
export function EnTetePage({
  icone: Icone,
  titre,
  description,
  couleur = "brand",
  mono = false,
}: {
  icone: LucideIcon;
  titre: React.ReactNode;
  description?: React.ReactNode;
  couleur?: string;
  /** Titre en chiffres alignés (numéro de pièce). */
  mono?: boolean;
}) {
  return (
    <Group gap="md" wrap="nowrap" align="center">
      <ThemeIcon size={52} radius="lg" variant="light" color={couleur} visibleFrom="xs">
        <Icone size={26} strokeWidth={1.8} />
      </ThemeIcon>
      <div className="min-w-0">
        <Title order={1} size="h2" fw={800} className={mono ? "font-mono tabular-nums" : undefined}>
          {titre}
        </Title>
        {description && (
          <Text size="sm" c="dimmed" mt={2}>
            {description}
          </Text>
        )}
      </div>
    </Group>
  );
}
