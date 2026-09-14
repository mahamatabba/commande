/**
 * Traduction des erreurs PostgreSQL en messages métier.
 *
 * Sans cette couche, une contrainte violée remonte jusqu'au rendu et produit
 * une page 500 : l'utilisateur perd sa saisie et ne sait pas ce qu'il a fait
 * de travers. Les contraintes sont des règles métier — elles méritent une
 * phrase, pas une trace technique.
 */

/**
 * Erreur destinée à être affichée telle quelle à l'utilisateur. Sert à sortir
 * d'une transaction en l'annulant tout en conservant un message métier — à
 * distinguer d'une panne technique, qui doit remonter.
 */
export class ErreurMetier extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurMetier";
  }
}

/** Codes SQLSTATE des violations de contrainte d'intégrité. */
const UNICITE = "23505";
const CLE_ETRANGERE = "23503";
const CONTRAINTE_CHECK = "23514";

type ErreurPg = { code?: unknown; constraint?: unknown; detail?: unknown };

function lireErreurPg(erreur: unknown): ErreurPg | null {
  if (!erreur || typeof erreur !== "object") return null;
  // Le driver Neon enveloppe parfois l'erreur d'origine dans `cause`.
  const candidat = erreur as ErreurPg & { cause?: unknown };
  if (typeof candidat.code === "string") return candidat;
  if (candidat.cause && typeof candidat.cause === "object") {
    const cause = candidat.cause as ErreurPg;
    if (typeof cause.code === "string") return cause;
  }
  return null;
}

export function estViolationUnicite(erreur: unknown, contrainte?: string): boolean {
  const pg = lireErreurPg(erreur);
  if (pg?.code !== UNICITE) return false;
  return contrainte ? pg.constraint === contrainte : true;
}

/**
 * Messages associés aux contraintes nommées. Toute contrainte listée ici
 * produit une phrase compréhensible ; les autres retombent sur un message
 * générique par famille de code.
 */
const MESSAGE_PAR_CONTRAINTE: Record<string, string> = {
  uq_factures_commande_client:
    "Cette vente a déjà été facturée. Ouvrez la facture existante depuis la fiche de la vente.",
  uq_proformas_commande_en_cours:
    "Une proforma est déjà en circulation pour cette vente. Annulez-la avant d'en établir une nouvelle.",
  proformas_numero_unique: "Ce numéro de proforma existe déjà.",
  proformas_numero_key: "Ce numéro de proforma existe déjà.",
  articles_code_unique: "Ce code article est déjà utilisé par un autre article.",
  articles_code_key: "Ce code article est déjà utilisé par un autre article.",
  users_email_unique: "Cet email est déjà utilisé par un autre compte.",
  users_email_key: "Cet email est déjà utilisé par un autre compte.",
  factures_numero_unique: "Ce numéro de facture existe déjà.",
  factures_numero_key: "Ce numéro de facture existe déjà.",
  commandes_client_numero_unique: "Ce numéro de vente existe déjà.",
  commandes_client_numero_key: "Ce numéro de vente existe déjà.",
  commandes_fournisseur_numero_unique: "Ce numéro d'achat existe déjà.",
  commandes_fournisseur_numero_key: "Ce numéro d'achat existe déjà.",
  reglements_exactement_une_reference:
    "Un règlement doit porter soit sur une facture, soit sur un achat, jamais les deux.",
};

/**
 * Renvoie un message métier pour une erreur de base connue, ou `null` si
 * l'erreur n'en est pas une — auquel cas il faut la laisser remonter plutôt
 * que de la masquer derrière un message rassurant et faux.
 */
export function messageErreurBase(erreur: unknown): string | null {
  const pg = lireErreurPg(erreur);
  if (!pg) return null;

  if (typeof pg.constraint === "string") {
    const message = MESSAGE_PAR_CONTRAINTE[pg.constraint];
    if (message) return message;
  }

  switch (pg.code) {
    case UNICITE:
      return "Cette valeur existe déjà : elle doit être unique.";
    case CLE_ETRANGERE:
      return "L'élément référencé n'existe pas ou n'est plus disponible.";
    case CONTRAINTE_CHECK:
      return "Les données saisies ne respectent pas une règle de cohérence.";
    default:
      return null;
  }
}
