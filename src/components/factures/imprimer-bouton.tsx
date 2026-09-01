"use client";

import { Button } from "@/components/ui/button";

export function ImprimerBouton() {
  return <Button onClick={() => window.print()}>Imprimer</Button>;
}
