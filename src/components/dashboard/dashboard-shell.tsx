"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import {
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { SidebarNav } from "./sidebar-nav";
import type { NavSection } from "@/lib/nav";

const LIBELLE_ROLE: Record<string, string> = {
  ADMIN: "Administrateur",
  SUPERVISEUR: "Superviseur",
  AGENT: "Agent",
};

function initiales(nom?: string | null): string {
  if (!nom) return "?";
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");
}

/** Hauteur de l'en-tête de l'application, en pixels. */
export const HAUTEUR_ENTETE = 76;

export function DashboardShell({
  navSections,
  userName,
  userRole,
  signOutAction,
  children,
}: {
  navSections: NavSection[];
  userName?: string | null;
  userRole?: string | null;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure();
  const role = userRole ? (LIBELLE_ROLE[userRole] ?? userRole) : null;

  return (
    <AppShell
      header={{ height: HAUTEUR_ENTETE }}
      navbar={{ width: 256, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header
        style={{
          // Rappel du papier à en-tête : filet orange sous la marque.
          borderBottom: "3px solid #FAA755",
          background:
            "linear-gradient(90deg, var(--mantine-color-dark-8) 0%, var(--mantine-color-dark-7) 60%, var(--mantine-color-dark-8) 100%)",
        }}
      >
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <Link href="/dashboard" className="flex items-center gap-3" aria-label="Tableau de bord">
              <span className="flex h-[58px] w-[66px] shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                <Image
                  src="/brand/aei-icon.png"
                  alt="Logo AEI"
                  width={248}
                  height={215}
                  priority
                  className="h-full w-auto object-contain"
                />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="hidden truncate text-[15px] font-bold tracking-wide text-white md:block">
                  ABDELDJELIL ÉTUDE INFORMATIQUE
                </span>
                <span className="text-[15px] font-bold tracking-wide text-white md:hidden">AEI</span>
                <span className="text-[12px] font-medium text-[#00AEEF]">Gestion commerciale</span>
              </span>
            </Link>
          </Group>

          <Group gap="lg" wrap="nowrap">
            <Group gap={8} visibleFrom="md" wrap="nowrap">
              <span className="flex size-9 items-center justify-center rounded-full bg-white p-[3px]">
                <Image src="/brand/hp-logo.png" alt="HP" width={66} height={66} className="h-full w-full" />
              </span>
              <Text size="xs" c="dimmed" lh={1.2}>
                Partenaire
                <br />
                agréé HP
              </Text>
            </Group>

            <Menu position="bottom-end" width={220} shadow="md" withinPortal>
              <Menu.Target>
                <UnstyledButton aria-label="Mon compte">
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color="brand" radius="xl" size={40} variant="filled">
                      {initiales(userName)}
                    </Avatar>
                    <div className="hidden text-left sm:block">
                      <Text size="sm" fw={600} lh={1.2}>
                        {userName}
                      </Text>
                      {role && (
                        <Text size="xs" c="dimmed" lh={1.2}>
                          {role}
                        </Text>
                      )}
                    </div>
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{userName}</Menu.Label>
                <form action={signOutAction}>
                  <Menu.Item component="button" type="submit" color="red" leftSection={<LogOut size={16} />}>
                    Se déconnecter
                  </Menu.Item>
                </form>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea} pt="xs">
          <SidebarNav sections={navSections} onNavigate={close} />
        </AppShell.Section>

        <AppShell.Section>
          <Stack
            gap={6}
            pt="sm"
            px="xs"
            style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}
          >
            <Group gap="sm" wrap="nowrap">
              <Avatar color="brand" radius="xl" size={34}>
                {initiales(userName)}
              </Avatar>
              <div className="min-w-0">
                <Text size="sm" fw={600} truncate>
                  {userName}
                </Text>
                {role && (
                  <Text size="xs" c="dimmed">
                    {role}
                  </Text>
                )}
              </div>
            </Group>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 text-[13px] text-[var(--mantine-color-dark-2)] transition-colors hover:text-[var(--mantine-color-red-5)]"
              >
                <LogOut size={14} /> Se déconnecter
              </button>
            </form>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: "var(--mantine-color-dark-8)" }}>
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
