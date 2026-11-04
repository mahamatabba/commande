"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  Building2,
  ChartColumn,
  FileSignature,
  FileText,
  HandCoins,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge, Divider, NavLink, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import type { NavIcone, NavSection } from "@/lib/nav";
import { SENS_COMPTEURS } from "@/lib/nav-compteurs-libelles";

const ICONES: Record<NavIcone, LucideIcon> = {
  tableau: LayoutDashboard,
  statistiques: ChartColumn,
  fournisseurs: Building2,
  achats: ShoppingCart,
  clients: Users,
  ventes: ShoppingBag,
  proformas: FileSignature,
  factures: FileText,
  articles: Package,
  reglements: HandCoins,
  caisse: Wallet,
  utilisateurs: UserCog,
  journal: History,
  parametres: Settings,
};

function estActif(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Menu latéral, par sections. Deux présentations :
 * - dépliée : icône, libellé et pastille du nombre d'éléments en attente ;
 * - repliée : icônes seules, libellé et compteur en infobulle, pour laisser
 *   toute la largeur aux tableaux.
 */
export function SidebarNav({
  sections,
  compteurs = {},
  replie = false,
  onNavigate,
}: {
  sections: NavSection[];
  compteurs?: Record<string, number>;
  replie?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  if (replie) {
    return (
      <Stack gap={4} align="center">
        {sections.map((section, i) => (
          <Stack key={section.titre} gap={4} align="center" w="100%">
            {i > 0 && <Divider w="60%" my={4} color="var(--aei-ligne)" />}
            {section.items.map((item) => {
              const actif = estActif(pathname, item.href);
              const Icone = ICONES[item.icone] ?? BookOpenCheck;
              const compteur = compteurs[item.href] ?? 0;
              return (
                <Tooltip
                  key={item.href}
                  label={compteur > 0 ? `${item.label} — ${compteur} ${SENS_COMPTEURS[item.href] ?? ""}` : item.label}
                  position="right"
                  withArrow
                >
                  <UnstyledButton
                    component={Link}
                    href={item.href}
                    onClick={onNavigate}
                    aria-label={item.label}
                    className={`relative flex size-11 items-center justify-center rounded-lg transition-colors ${
                      actif
                        ? "bg-[rgba(0,160,218,0.18)] text-[var(--mantine-color-brand-4)]"
                        : "text-[var(--aei-texte-doux)] hover:bg-[var(--aei-surface-2)] hover:text-[var(--mantine-color-text)]"
                    }`}
                  >
                    <Icone size={20} strokeWidth={1.8} />
                    {compteur > 0 && (
                      <span className="absolute top-1 right-1 size-2 rounded-full bg-[#FAA755]" />
                    )}
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </Stack>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap={8}>
      {sections.map((section) => (
        <div key={section.titre}>
          <Text size="11px" fw={700} c="dimmed" tt="uppercase" px="sm" mb={0} style={{ letterSpacing: 0.8 }}>
            {section.titre}
          </Text>
          {section.items.map((item) => {
            const actif = estActif(pathname, item.href);
            const Icone = ICONES[item.icone] ?? BookOpenCheck;
            const compteur = compteurs[item.href] ?? 0;
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                leftSection={<Icone size={18} strokeWidth={1.8} />}
                rightSection={
                  compteur > 0 ? (
                    <Tooltip label={`${compteur} ${SENS_COMPTEURS[item.href] ?? ""}`} position="right" withArrow>
                      <Badge size="sm" radius="xl" variant={actif ? "filled" : "light"} color={actif ? "brand" : "aei"}>
                        {compteur}
                      </Badge>
                    </Tooltip>
                  ) : null
                }
                active={actif}
                variant="light"
                onClick={onNavigate}
                py={5}
                style={{
                  borderRadius: "var(--mantine-radius-md)",
                  // Barre d'accent à gauche de l'entrée active.
                  boxShadow: actif ? "inset 3px 0 0 var(--mantine-color-brand-5)" : undefined,
                }}
                fw={actif ? 600 : 500}
              />
            );
          })}
        </div>
      ))}
    </Stack>
  );
}
