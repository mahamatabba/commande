"use client";

import { EcranErreur, type ErreurAffichable } from "@/components/shared/ecran-erreur";

/**
 * Frontière d'erreur interne au tableau de bord : l'erreur s'affiche dans le
 * gabarit, barre latérale comprise, pour que l'utilisateur reste dans
 * l'application et puisse simplement passer à un autre écran.
 */
export default function ErreurTableauDeBord({
  error,
  reset,
}: {
  error: ErreurAffichable;
  reset: () => void;
}) {
  return <EcranErreur erreur={error} reessayer={reset} />;
}
