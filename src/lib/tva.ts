import { TAUX_TVA_STANDARD } from "@/lib/constants";

export type DecompositionTva = {
  /** Somme des lignes, telle que saisie. */
  montantHt: number;
  /** true si aucune TVA n'est due (client exonéré ou choix à l'émission). */
  exonereTva: boolean;
  /** Taux effectivement appliqué, en pourcentage. 0 si exonéré. */
  tauxTva: number;
  /** TVA due, arrondie au franc. */
  montantTva: number;
  /** Ce que le client doit réellement payer : HT + TVA. */
  montantTotal: number;
};

/**
 * Décompose un montant hors taxe en HT / TVA / TTC.
 *
 * Sens du calcul : la TVA s'AJOUTE au montant saisi. C'est l'inverse de
 * l'ancien comportement, qui traitait le total comme un TTC et en déduisait
 * un HT à rebours — ce qui sous-facturait le client de tout le montant de la
 * taxe.
 *
 * L'arrondi se fait sur la TVA, au franc le plus proche (le FCFA n'a pas de
 * centime), puis le TTC est recomposé par addition. Ainsi HT + TVA = TTC est
 * toujours vrai à l'affichage comme en base, sans écart d'un franc.
 */
export function decomposerTva(
  montantHt: number,
  options: { exonere?: boolean; taux?: number } = {},
): DecompositionTva {
  const exonereTva = options.exonere ?? false;
  const tauxDemande = options.taux ?? TAUX_TVA_STANDARD;
  const tauxTva = exonereTva ? 0 : tauxDemande;
  const montantTva = Math.round((montantHt * tauxTva) / 100);

  return {
    montantHt,
    exonereTva,
    tauxTva,
    montantTva,
    montantTotal: montantHt + montantTva,
  };
}

/**
 * Formate un taux pour l'affichage : « 19,5 % », « 18 % ». Évite d'écrire
 * « 19.50 % » sur un document en français.
 */
export function formatTaux(taux: number): string {
  return `${taux.toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} %`;
}
