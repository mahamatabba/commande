import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-8 w-52" />
      {action && <Skeleton className="h-9 w-36" />}
    </div>
  );
}

/** Barre de filtres : quelques champs alignés et un bouton. */
export function SqueletteFiltres({ champs = 3 }: { champs?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {Array.from({ length: champs }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-9 w-40" />
        </div>
      ))}
      <Skeleton className="h-9 w-24" />
    </div>
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
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-4 border-b bg-[#F4F3F0] px-4 py-3">
        {Array.from({ length: colonnes }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: lignes }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: colonnes }).map((_, j) => (
              <Skeleton key={j} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bloc encadré générique, utilisé pour les cartes de formulaire ou de fiche. */
export function SqueletteCarte({ lignes = 3 }: { lignes?: number }) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: lignes }).map((_, i) => (
        <Skeleton key={i} className="h-3.5 w-full" />
      ))}
    </div>
  );
}

/** Grille de tuiles chiffrées du tableau de bord et des statistiques. */
export function SqueletteTuiles({ nombre = 4 }: { nombre?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: nombre }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border bg-card p-5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Emplacement d'un graphique, à la hauteur réelle du conteneur Recharts. */
export function SqueletteGraphique({ hauteur = "h-64" }: { hauteur?: string }) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <Skeleton className="h-4 w-44" />
      <Skeleton className={`w-full ${hauteur}`} />
    </div>
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
    <div className="space-y-4">
      <SqueletteEntete action={action} />
      {filtres > 0 && <SqueletteFiltres champs={filtres} />}
      <SqueletteTableau colonnes={colonnes} lignes={lignes} />
    </div>
  );
}

/** Page de fiche : titre, bandeau d'informations puis tableaux liés. */
export function SqueletteDetail({ tableaux = 2 }: { tableaux?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-7 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      {Array.from({ length: tableaux }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <SqueletteTableau colonnes={4} lignes={3} />
        </div>
      ))}
    </div>
  );
}

/** Page de saisie : titre, cartes de formulaire et récapitulatif latéral. */
export function SqueletteFormulaire() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <SqueletteCarte lignes={2} />
          <div className="space-y-3 rounded-lg border bg-card p-5">
            <Skeleton className="h-4 w-28" />
            <SqueletteTableau colonnes={6} lignes={2} />
          </div>
        </div>
        <SqueletteCarte lignes={2} />
      </div>
    </div>
  );
}
