import { Paper, Stack, Text } from "@mantine/core";
import { formatMontant } from "@/lib/format";

export function StatTile({
  label,
  montant,
  note,
  highlight = false,
}: {
  label: string;
  montant: number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <Paper
      withBorder
      radius="md"
      p="lg"
      style={
        highlight
          ? { backgroundColor: "var(--mantine-color-brand-6)", borderColor: "var(--mantine-color-brand-6)" }
          : undefined
      }
    >
      <Stack gap={4}>
        <Text size="sm" c={highlight ? "white" : "dimmed"} opacity={highlight ? 0.7 : 1}>
          {label}
        </Text>
        <Text
          className="font-mono tabular-nums"
          fw={600}
          size={highlight ? "30px" : "26px"}
          c={highlight ? "white" : undefined}
        >
          {formatMontant(montant)}
        </Text>
        {note && (
          <Text size="xs" c={highlight ? "white" : "dimmed"} opacity={highlight ? 0.7 : 1}>
            {note}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
