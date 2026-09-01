"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { emettreFacture } from "@/app/(dashboard)/factures/actions";

export function EmettreFactureForm({ commandeClientId }: { commandeClientId: number }) {
  const [state, formAction, pending] = useActionState(emettreFacture, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="commandeClientId" value={commandeClientId} />
      {state.error && <p className="text-sm text-[#8A211C]">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Émission..." : "Émettre la facture"}
      </Button>
    </form>
  );
}
