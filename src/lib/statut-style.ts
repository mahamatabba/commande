import type { BadgeProps } from "@mantine/core";
import {
  TON_COMMANDE_CLIENT,
  TON_COMMANDE_FOURNISSEUR,
  TON_FACTURE,
  TON_PROFORMA,
  type TonStatut,
} from "@/lib/statut-ton";

/**
 * Traduction des tons de `statut-ton.ts` en props du `Badge` Mantine, pour
 * l'écran. Le pendant papier de ce fichier est `lib/pdf/gabarit.tsx`, qui
 * traduit les mêmes tons en couleurs hexadécimales.
 */
type StyleBadge = Pick<BadgeProps, "color" | "variant"> & { td?: "line-through" };

const STYLES: Record<TonStatut, StyleBadge> = {
  neutre: { color: "gray", variant: "light" },
  annulee: { color: "gray", variant: "light", td: "line-through" },
  enCours: { color: "brand", variant: "light" },
  bon: { color: "green", variant: "light" },
  attention: { color: "yellow", variant: "light" },
  urgent: { color: "red", variant: "light" },
};

function badges(tons: Record<string, TonStatut>): Record<string, StyleBadge> {
  return Object.fromEntries(
    Object.entries(tons).map(([statut, ton]) => [statut, STYLES[ton]]),
  );
}

export const STATUT_COMMANDE_FOURNISSEUR_BADGE = badges(TON_COMMANDE_FOURNISSEUR);
export const STATUT_COMMANDE_CLIENT_BADGE = badges(TON_COMMANDE_CLIENT);
export const STATUT_PROFORMA_BADGE = badges(TON_PROFORMA);
export const STATUT_FACTURE_BADGE = badges(TON_FACTURE);
