import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";

export default function PageIntrouvable() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Paper withBorder radius="md" p="xl" className="w-full max-w-lg">
        <Stack gap="md">
          <ThemeIcon variant="light" color="blue" size="lg" radius="md" className="self-start">
            <FileQuestion size={18} aria-hidden />
          </ThemeIcon>

          <div>
            <Title order={2} size="h3">Page introuvable</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Le document demandé n&apos;existe pas, ou il a été supprimé. Vérifiez le
              numéro, ou repartez d&apos;un écran de liste.
            </Text>
          </div>

          <Group gap="sm">
            <Button component={Link} href="/dashboard">Tableau de bord</Button>
            <Button variant="outline" component={Link} href="/factures">
              Liste des factures
            </Button>
          </Group>
        </Stack>
      </Paper>
    </div>
  );
}
