const NEUTRE = "bg-[#F0EEE9] text-[#6B6862] border-[#D9D6D0]";
const ANNULEE = "bg-[#F0EEE9] text-[#9C9A95] border-[#D9D6D0] line-through";
const EN_COURS = "bg-[#EEF2F7] text-[#1E3A5F] border-[#C6D2E0]";
const BON = "bg-[#E7F0EB] text-[#14563E] border-[#BEDACD]";
const ATTENTION = "bg-[#FBF1E0] text-[#8A5300] border-[#EBD3A8]";
const URGENT = "bg-[#F8E8E6] text-[#8A211C] border-[#E3BEBB]";

export const STATUT_COMMANDE_FOURNISSEUR_CLASS: Record<string, string> = {
  BROUILLON: NEUTRE,
  VALIDEE: EN_COURS,
  RECUE: BON,
  ANNULEE: ANNULEE,
};

export const STATUT_COMMANDE_CLIENT_CLASS: Record<string, string> = {
  BROUILLON: NEUTRE,
  VALIDEE: EN_COURS,
  FACTUREE: BON,
  ANNULEE: ANNULEE,
};

export const STATUT_FACTURE_CLASS: Record<string, string> = {
  NON_PAYEE: URGENT,
  PARTIELLEMENT_PAYEE: ATTENTION,
  SOLDEE: BON,
  ANNULEE: ANNULEE,
};
