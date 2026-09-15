import {
  TON_COMMANDE_CLIENT,
  TON_COMMANDE_FOURNISSEUR,
  TON_FACTURE,
  TON_PROFORMA,
  type TonStatut,
} from "@/lib/statut-ton";

/**
 * Traduction des tons de `statut-ton.ts` en classes Tailwind, pour l'écran.
 * Le pendant papier de ce fichier est `lib/pdf/gabarit.tsx`, qui traduit les
 * mêmes tons en couleurs hexadécimales.
 */
const CLASSES: Record<TonStatut, string> = {
  neutre: "bg-[#F0EEE9] text-[#6B6862] border-[#D9D6D0]",
  annulee: "bg-[#F0EEE9] text-[#9C9A95] border-[#D9D6D0] line-through",
  enCours: "bg-[#EEF2F7] text-[#1E3A5F] border-[#C6D2E0]",
  bon: "bg-[#E7F0EB] text-[#14563E] border-[#BEDACD]",
  attention: "bg-[#FBF1E0] text-[#8A5300] border-[#EBD3A8]",
  urgent: "bg-[#F8E8E6] text-[#8A211C] border-[#E3BEBB]",
};

function classes(tons: Record<string, TonStatut>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tons).map(([statut, ton]) => [statut, CLASSES[ton]]),
  );
}

export const STATUT_COMMANDE_FOURNISSEUR_CLASS = classes(TON_COMMANDE_FOURNISSEUR);
export const STATUT_COMMANDE_CLIENT_CLASS = classes(TON_COMMANDE_CLIENT);
export const STATUT_PROFORMA_CLASS = classes(TON_PROFORMA);
export const STATUT_FACTURE_CLASS = classes(TON_FACTURE);
