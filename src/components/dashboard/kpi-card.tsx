import Link from "next/link";
import { Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { formatMontant } from "@/lib/format";

/**
 * Indicateur du tableau de bord : une icône, un libellé, une valeur, et en
 * option une tendance par rapport à la période précédente.
 *
 * Composant serveur : l'icône est passée en élément déjà rendu, jamais en
 * référence de composant (une fonction ne traverse pas vers le client).
 */
export function KpiCard({
  label,
  valeur,
  icone: Icone,
  couleur = "brand",
  note,
  href,
  evolution,
  format = "montant",
}: {
  label: string;
  valeur: number;
  icone: LucideIcon;
  couleur?: string;
  note?: string;
  href?: string;
  /** Variation en % par rapport à la période précédente, `null` si inconnue. */
  evolution?: number | null;
  format?: "montant" | "nombre";
}) {
  const contenu = (
    <Paper
      withBorder
      radius="lg"
      p="lg"
      h="100%"
      className={href ? "transition-colors hover:border-[var(--mantine-color-brand-6)]" : undefined}
      style={{ borderTop: `3px solid var(--mantine-color-${couleur}-6)` }}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text size="sm" c="dimmed" fw={500}>
            {label}
          </Text>
          <ThemeIcon variant="light" color={couleur} size={38} radius="md">
            <Icone size={20} />
          </ThemeIcon>
        </Group>
        <Text fw={700} size="26px" className="font-mono tabular-nums" lh={1.1}>
          {format === "montant" ? formatMontant(valeur) : valeur.toLocaleString("fr-FR")}
        </Text>
        <Group gap={6} wrap="nowrap" mih={18}>
          {evolution !== undefined && evolution !== null && (
            <Group gap={2} wrap="nowrap">
              {evolution >= 0 ? (
                <TrendingUp size={14} color="var(--mantine-color-green-5)" />
              ) : (
                <TrendingDown size={14} color="var(--mantine-color-red-5)" />
              )}
              <Text size="xs" fw={600} c={evolution >= 0 ? "green.5" : "red.5"}>
                {evolution >= 0 ? "+" : ""}
                {evolution} %
              </Text>
            </Group>
          )}
          {note && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {note}
            </Text>
          )}
        </Group>
      </Stack>
    </Paper>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {contenu}
    </Link>
  ) : (
    contenu
  );
}
