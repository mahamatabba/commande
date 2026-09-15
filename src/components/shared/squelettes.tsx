import { Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";

/**
 * Silhouettes affichées pendant le chargement d'une page.
 *
 * Elles ne sont pas décoratives : sans un `loading.tsx` sur un segment, Next
 * n'a aucune frontière de suspension à précharger, et le clic sur un lien
 * fige l'écran pendant tout l'aller-retour vers le serveur. Depuis N'Djaména
 * ce délai se compte en centaines de millisecondes — c'est lui qui donne la
 * sensation que l'application ne répond pas.
 *
 * Chaque silhouette reprend donc la charpente réelle de l'écran qu'elle
 * remplace (mêmes hauteurs, mêmes colonnes) : la page ne sursaute pas au
 * moment où les vraies données prennent la place.
 */

/** Titre de page, éventuellement suivi d'un bouton d'action à droite. */
export function SqueletteEntete({ action = false }: { action?: boolean }) {
  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Skeleton className="h-8 w-52" />
      {action && <Skeleton className="h-9 w-36" />}
    </Group>
  );
}

/** Barre de filtres : quelques champs alignés et un bouton. */
export function SqueletteFiltres({ champs = 3 }: { champs?: number }) {
  return (
    <Group align="flex-end" wrap="wrap" gap="sm">
      {Array.from({ length: champs }).map((_, i) => (
        <Stack key={i} gap={4}>
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-9 w-40" />
        </Stack>
      ))}
      <Skeleton className="h-9 w-24" />
    </Group>
  );
}

/**
 * Tableau de liste. `colonnes` cadre la largeur des cellules simulées et
 * `lignes` la hauteur totale : une silhouette trop courte ferait remonter la
 * page d'un coup à l'arrivée des données.
 */
export function SqueletteTableau({
  colonnes = 5,
  lignes = 8,
}: {
  colonnes?: number;
  lignes?: number;
}) {
  return (
    <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
      <Group
        gap="md"
        wrap="nowrap"
        px="md"
        py="sm"
        className="border-b border-[var(--mantine-color-dark-4)] bg-[var(--mantine-color-dark-5)]"
      >
        {Array.from({ length: colonnes }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </Group>
      <div className="divide-y divide-[var(--mantine-color-dark-4)]">
        {Array.from({ length: lignes }).map((_, i) => (
          <Group key={i} gap="md" wrap="nowrap" px="md" py={14}>
            {Array.from({ length: colonnes }).map((_, j) => (
              <Skeleton key={j} className="h-3.5 flex-1" />
            ))}
          </Group>
        ))}
      </div>
    </Paper>
  );
}

/** Bloc encadré générique, utilisé pour les cartes de formulaire ou de fiche. */
export function SqueletteCarte({ lignes = 3 }: { lignes?: number }) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Stack gap="sm">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: lignes }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-full" />
        ))}
      </Stack>
    </Paper>
  );
}

/** Grille de tuiles chiffrées du tableau de bord et des statistiques. */
export function SqueletteTuiles({ nombre = 4 }: { nombre?: number }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      {Array.from({ length: nombre }).map((_, i) => (
        <Paper key={i} withBorder radius="md" p="lg">
          <Stack gap={8}>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-28" />
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

/** Emplacement d'un graphique, à la hauteur réelle du conteneur Recharts. */
export function SqueletteGraphique({ hauteur = "h-64" }: { hauteur?: string }) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Stack gap="sm">
        <Skeleton className="h-4 w-44" />
        <Skeleton className={`w-full ${hauteur}`} />
      </Stack>
    </Paper>
  );
}

/** Page de liste complète : en-tête, filtres optionnels et tableau. */
export function SqueletteListe({
  colonnes = 5,
  lignes = 8,
  action = false,
  filtres = 0,
}: {
  colonnes?: number;
  lignes?: number;
  action?: boolean;
  filtres?: number;
}) {
  return (
    <Stack gap="md">
      <SqueletteEntete action={action} />
      {filtres > 0 && <SqueletteFiltres champs={filtres} />}
      <SqueletteTableau colonnes={colonnes} lignes={lignes} />
    </Stack>
  );
}

/** Page de fiche : titre, bandeau d'informations puis tableaux liés. */
export function SqueletteDetail({ tableaux = 2 }: { tableaux?: number }) {
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Stack gap={8}>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-7 w-44" />
        </Stack>
        <Group gap="sm">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </Group>
      </Group>
      {Array.from({ length: tableaux }).map((_, i) => (
        <Stack key={i} gap={8}>
          <Skeleton className="h-5 w-32" />
          <SqueletteTableau colonnes={4} lignes={3} />
        </Stack>
      ))}
    </Stack>
  );
}

/** Page de saisie : titre, cartes de formulaire et récapitulatif latéral. */
export function SqueletteFormulaire() {
  return (
    <Stack gap="lg" className="max-w-5xl">
      <Stack gap={8}>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </Stack>
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Stack gap="lg" className="lg:col-span-2">
          <SqueletteCarte lignes={2} />
          <Paper withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Skeleton className="h-4 w-28" />
              <SqueletteTableau colonnes={6} lignes={2} />
            </Stack>
          </Paper>
        </Stack>
        <SqueletteCarte lignes={2} />
      </div>
    </Stack>
  );
}
