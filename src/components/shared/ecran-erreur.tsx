"use client";

import Link from "next/link";
import { AlertTriangle, Lock, RotateCcw } from "lucide-react";
import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { DIGEST_ACCES_REFUSE } from "@/lib/permissions";

export type ErreurAffichable = Error & { digest?: string };

/**
 * Écran d'erreur commun à toutes les frontières d'erreur de l'application.
 *
 * Il sépare deux situations que l'utilisateur ne doit pas confondre :
 * un accès refusé (il n'a pas le droit, rien n'est cassé) et une panne
 * technique (l'action n'a pas abouti, il faut réessayer ou alerter).
 */
export function EcranErreur({
  erreur,
  reessayer,
}: {
  erreur: ErreurAffichable;
  reessayer?: () => void;
}) {
  const accesRefuse = erreur.digest === DIGEST_ACCES_REFUSE;

  const Icone = accesRefuse ? Lock : AlertTriangle;
  const titre = accesRefuse ? "Accès refusé" : "Une erreur est survenue";
  const explication = accesRefuse
    ? "Votre rôle ne donne pas accès à cet écran. Si vous pensez que c'est une erreur, demandez à l'administrateur de vérifier vos droits."
    : "L'écran n'a pas pu être chargé. Aucune donnée n'a été modifiée. Réessayez ; si le problème persiste, signalez-le à l'administrateur.";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Paper withBorder radius="md" p="xl" className="w-full max-w-lg">
        <Stack gap="md">
          <ThemeIcon
            variant="light"
            color={accesRefuse ? "blue" : "red"}
            size="lg"
            radius="md"
            className="self-start"
          >
            <Icone size={18} aria-hidden />
          </ThemeIcon>

          <div>
            <Title order={2} size="h3">{titre}</Title>
            <Text size="sm" c="dimmed" mt={4}>{explication}</Text>

            {!accesRefuse && erreur.digest && (
              <Text size="xs" c="dimmed" mt="sm" className="font-mono tabular-nums">
                Référence technique : {erreur.digest}
              </Text>
            )}
          </div>

          <Group gap="sm">
            {!accesRefuse && reessayer && (
              <Button onClick={reessayer} leftSection={<RotateCcw size={16} />}>
                Réessayer
              </Button>
            )}
            <Button variant="outline" component={Link} href="/dashboard">
              Retour au tableau de bord
            </Button>
          </Group>
        </Stack>
      </Paper>
    </div>
  );
}
