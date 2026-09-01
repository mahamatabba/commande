import type { Session } from "next-auth";

export type Role = "AGENT" | "SUPERVISEUR" | "ADMIN";

/**
 * Une permission par ligne (ou sous-ligne) du tableau des rôles du cahier
 * des charges. Les lectures et écritures sont volontairement séparées : le
 * superviseur a un accès "lecture seule" sur plusieurs ressources, ce qui
 * n'est pas la même chose que ne pas avoir accès du tout.
 */
export const PERMISSIONS = [
  "commandes_fournisseur:read",
  "commandes_fournisseur:write",
  "commandes_client:read",
  "commandes_client:write",
  "referentiels:read", // clients, fournisseurs, articles
  "referentiels:write",
  "factures:read",
  "factures:emettre",
  "reglements:saisir",
  "encaissements:read", // règlements de sens ENCAISSEMENT
  "decaissements:read", // règlements de sens DECAISSEMENT
  "caisse:solde:read",
  "impayes:read", // créances / factures non soldées
  "statistiques:achats_sorties",
  "statistiques:globales_marge",
  "utilisateurs:gerer",
  "journal:consulter",
  // Annulation d'une commande, facture ou règlement déjà créé — toujours
  // réservée à l'admin (règle métier n°5), même quand le rôle a par ailleurs
  // le droit d'écriture sur la ressource concernée.
  "annulation:effectuer",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Matrice centralisée des permissions par rôle. C'est la seule source de
 * vérité : aucune vérification `if (role === "ADMIN")` ne doit apparaître
 * ailleurs dans le code. Toute évolution des droits se fait ici.
 *
 * Référence : tableau "Rôles et permissions" du cahier des charges.
 */
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  AGENT: new Set<Permission>([
    "commandes_fournisseur:read",
    "commandes_fournisseur:write",
    "commandes_client:read",
    "commandes_client:write",
    "referentiels:read",
    "referentiels:write",
    "factures:read",
    "factures:emettre",
  ]),
  SUPERVISEUR: new Set<Permission>([
    "commandes_fournisseur:read",
    "commandes_client:read",
    "referentiels:read",
    "factures:read",
    "decaissements:read",
    "statistiques:achats_sorties",
  ]),
  ADMIN: new Set<Permission>(PERMISSIONS),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export class PermissionDeniedError extends Error {
  constructor(permission: Permission) {
    super(`Accès refusé : permission "${permission}" requise.`);
    this.name = "PermissionDeniedError";
  }
}

type SessionLike = Pick<Session, "user"> | null | undefined;

/**
 * À appeler en toute première ligne de chaque Server Action et de chaque
 * route handler qui touche à une ressource protégée. Lève une erreur si
 * l'utilisateur n'est pas authentifié, désactivé, ou n'a pas la permission
 * demandée. Ne jamais se contenter de masquer un élément d'interface : la
 * vérification serveur est la seule qui compte.
 */
export function requirePermission(
  session: SessionLike,
  permission: Permission,
): asserts session is Session {
  if (!session?.user) {
    throw new PermissionDeniedError(permission);
  }
  if (session.user.actif === false) {
    throw new PermissionDeniedError(permission);
  }
  if (!hasPermission(session.user.role, permission)) {
    throw new PermissionDeniedError(permission);
  }
}

/**
 * Variante booléenne pour les cas où l'on veut adapter l'affichage plutôt
 * que bloquer une action (ex : masquer un bouton). Ne remplace jamais
 * `requirePermission` côté serveur.
 */
export function can(session: SessionLike, permission: Permission): boolean {
  if (!session?.user || session.user.actif === false) return false;
  return hasPermission(session.user.role, permission);
}
