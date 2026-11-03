import type { Session } from "next-auth";
import { can, type Permission } from "@/lib/permissions";

/**
 * Nom d'icône (résolu côté client dans `sidebar-nav.tsx`). Une chaîne plutôt
 * qu'un composant : la liste est construite côté serveur et transmise à un
 * composant client, et une fonction ne traverse pas cette frontière.
 */
export type NavIcone =
  | "tableau"
  | "statistiques"
  | "fournisseurs"
  | "achats"
  | "clients"
  | "ventes"
  | "proformas"
  | "factures"
  | "articles"
  | "reglements"
  | "caisse"
  | "utilisateurs"
  | "journal"
  | "parametres";

export type NavItem = {
  href: string;
  label: string;
  icone: NavIcone;
  /** Une des permissions suffit à afficher le lien (OR logique). */
  permissions?: Permission[];
};

export type NavSection = { titre: string; items: NavItem[] };

/**
 * Le menu suit le circuit de l'entreprise : ce qu'on achète (avec les bons
 * de commande fournisseur), ce qu'on vend (proformas, factures), l'argent qui
 * circule. Le bon de commande appartient aux achats ; côté ventes, on parle
 * de vente, de proforma et de facture.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    titre: "Pilotage",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icone: "tableau" },
      {
        href: "/statistiques",
        label: "Statistiques",
        icone: "statistiques",
        permissions: ["statistiques:achats_sorties", "statistiques:globales_marge"],
      },
    ],
  },
  {
    titre: "Achats",
    items: [
      {
        href: "/commandes-fournisseur",
        label: "Bons de commande",
        icone: "achats",
        permissions: ["commandes_fournisseur:read"],
      },
      { href: "/fournisseurs", label: "Fournisseurs", icone: "fournisseurs", permissions: ["referentiels:read"] },
    ],
  },
  {
    titre: "Ventes",
    items: [
      { href: "/commandes-client", label: "Ventes", icone: "ventes", permissions: ["commandes_client:read"] },
      { href: "/proformas", label: "Proformas", icone: "proformas", permissions: ["factures:read"] },
      { href: "/factures", label: "Factures", icone: "factures", permissions: ["factures:read"] },
      { href: "/clients", label: "Clients", icone: "clients", permissions: ["referentiels:read"] },
    ],
  },
  {
    titre: "Catalogue",
    items: [{ href: "/articles", label: "Articles", icone: "articles", permissions: ["referentiels:read"] }],
  },
  {
    titre: "Trésorerie",
    items: [
      { href: "/reglements", label: "Règlements", icone: "reglements", permissions: ["reglements:saisir"] },
      { href: "/caisse", label: "Caisse", icone: "caisse", permissions: ["caisse:solde:read"] },
    ],
  },
  {
    titre: "Administration",
    items: [
      { href: "/utilisateurs", label: "Utilisateurs", icone: "utilisateurs", permissions: ["utilisateurs:gerer"] },
      { href: "/journal", label: "Journal d'activité", icone: "journal", permissions: ["journal:consulter"] },
      { href: "/parametres", label: "Paramètres", icone: "parametres", permissions: ["utilisateurs:gerer"] },
    ],
  },
];

/** Sections du menu visibles pour cette session ; une section vide disparaît. */
export function getNavSections(session: Session | null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    titre: section.titre,
    items: section.items.filter((item) => {
      if (!item.permissions || item.permissions.length === 0) return true;
      return item.permissions.some((p) => can(session, p));
    }),
  })).filter((section) => section.items.length > 0);
}
