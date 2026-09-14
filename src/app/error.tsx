"use client";

import { EcranErreur, type ErreurAffichable } from "@/components/shared/ecran-erreur";

export default function ErreurApplication({
  error,
  reset,
}: {
  error: ErreurAffichable;
  reset: () => void;
}) {
  return <EcranErreur erreur={error} reessayer={reset} />;
}
