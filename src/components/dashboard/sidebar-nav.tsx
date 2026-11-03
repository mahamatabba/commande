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
  ShoppingBag,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NavLink, Stack, Text } from "@mantine/core";
import type { NavIcone, NavSection } from "@/lib/nav";

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
};

export function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <Stack gap="md">
      {sections.map((section) => (
        <div key={section.titre}>
          <Text size="11px" fw={700} c="dimmed" tt="uppercase" px="sm" mb={4} style={{ letterSpacing: 0.8 }}>
            {section.titre}
          </Text>
          {section.items.map((item) => {
            const actif =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
              (item.href !== "/dashboard" && pathname === item.href);
            const Icone = ICONES[item.icone] ?? BookOpenCheck;
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                leftSection={<Icone size={18} strokeWidth={1.8} />}
                active={actif}
                variant="light"
                onClick={onNavigate}
                style={{ borderRadius: "var(--mantine-radius-md)" }}
                fw={actif ? 600 : 500}
              />
            );
          })}
        </div>
      ))}
    </Stack>
  );
}
