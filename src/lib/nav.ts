import type { Session } from "next-auth";
import { can, type Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  /** Une des permissions suffit à afficher le lien (OR logique). */
  permissions?: Permission[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/fournisseurs", label: "Fournisseurs", permissions: ["referentiels:read"] },
  { href: "/clients", label: "Clients", permissions: ["referentiels:read"] },
  { href: "/articles", label: "Articles", permissions: ["referentiels:read"] },
  {
    href: "/commandes-fournisseur",
    label: "Commandes fournisseur",
    permissions: ["commandes_fournisseur:read"],
  },
  {
    href: "/commandes-client",
    label: "Commandes client",
    permissions: ["commandes_client:read"],
  },
  { href: "/factures", label: "Factures", permissions: ["factures:read"] },
  { href: "/reglements", label: "Règlements", permissions: ["reglements:saisir"] },
  { href: "/caisse", label: "Caisse", permissions: ["caisse:solde:read"] },
  {
    href: "/statistiques",
    label: "Statistiques",
    permissions: ["statistiques:achats_sorties", "statistiques:globales_marge"],
  },
  { href: "/utilisateurs", label: "Utilisateurs", permissions: ["utilisateurs:gerer"] },
  { href: "/journal", label: "Journal d'activité", permissions: ["journal:consulter"] },
];

export function getNavItems(session: Session | null): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((p) => can(session, p));
  });
}
