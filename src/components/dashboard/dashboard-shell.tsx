"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Plus, Sun } from "lucide-react";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Button,
  Tooltip,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
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

/** Clé de mémorisation (par navigateur) du menu replié. */
const CLE_MENU_REPLIE = "aei:menu-replie";

export function DashboardShell({
  navSections,
  compteurs,
  raccourcis,
  userName,
  userRole,
  signOutAction,
  children,
}: {
  navSections: NavSection[];
  compteurs: Record<string, number>;
  raccourcis: { href: string; label: string }[];
  userName?: string | null;
  userRole?: string | null;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure();
  const [replie, setReplie] = useState(false);
  const { setColorScheme } = useMantineColorScheme();
  const schema = useComputedColorScheme("dark", { getInitialValueInEffect: true });

  // Préférence relue après le montage : le rendu serveur ne la connaît pas,
  // et la lire pendant le rendu provoquerait un écart d'hydratation.
  useEffect(() => {
    try {
      if (localStorage.getItem(CLE_MENU_REPLIE) === "1") setReplie(true);
    } catch {
      /* stockage indisponible (navigation privée) : menu déplié */
    }
  }, []);

  function basculerMenu() {
    setReplie((r) => {
      try {
        localStorage.setItem(CLE_MENU_REPLIE, r ? "0" : "1");
      } catch {
        /* sans effet si le stockage est indisponible */
      }
      return !r;
    });
  }
  const role = userRole ? (LIBELLE_ROLE[userRole] ?? userRole) : null;

  return (
    <AppShell
      header={{ height: HAUTEUR_ENTETE }}
      navbar={{ width: { base: 256, sm: replie ? 76 : 256 }, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header
        style={{
          // Rappel du papier à en-tête : filet orange sous la marque.
          borderBottom: "3px solid #FAA755",
          background:
            "linear-gradient(90deg, #0C1622 0%, #11202F 60%, #0C1622 100%)",
        }}
      >
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="white" aria-label="Menu" />
            <Tooltip label={replie ? "Déplier le menu" : "Replier le menu"}>
              <ActionIcon
                variant="subtle"
                color="gray.3"
                size="lg"
                visibleFrom="sm"
                onClick={basculerMenu}
                aria-label={replie ? "Déplier le menu" : "Replier le menu"}
              >
                {replie ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </ActionIcon>
            </Tooltip>
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
              <Text size="xs" c="gray.5" lh={1.2}>
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
                      <Text size="sm" fw={600} lh={1.2} c="white">
                        {userName}
                      </Text>
                      {role && (
                        <Text size="xs" c="gray.5" lh={1.2}>
                          {role}
                        </Text>
                      )}
                    </div>
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{userName}</Menu.Label>
                <Menu.Item
                  leftSection={schema === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  onClick={() => setColorScheme(schema === "dark" ? "light" : "dark")}
                >
                  {schema === "dark" ? "Thème clair" : "Thème sombre"}
                </Menu.Item>
                <Menu.Divider />
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

      <AppShell.Navbar p="sm" style={{ transition: "width 150ms ease" }}>
        {raccourcis.length > 0 && (
          <AppShell.Section mb="sm">
            <Menu position={replie ? "right-start" : "bottom-start"} width={230} shadow="md" withinPortal>
              <Menu.Target>
                {replie ? (
                  <Tooltip label="Nouveau…" position="right">
                    <ActionIcon size={44} radius="md" mx="auto" display="flex" aria-label="Nouveau">
                      <Plus size={20} />
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <Button fullWidth leftSection={<Plus size={16} />} rightSection={<ChevronDown size={14} />} justify="space-between">
                    Nouveau
                  </Button>
                )}
              </Menu.Target>
              <Menu.Dropdown>
                {raccourcis.map((r) => (
                  <Menu.Item key={r.href} component={Link} href={r.href} onClick={close}>
                    {r.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </AppShell.Section>
        )}

        <AppShell.Section grow component={ScrollArea} pt="xs">
          <SidebarNav sections={navSections} compteurs={compteurs} replie={replie} onNavigate={close} />
        </AppShell.Section>

        <AppShell.Section>
          {replie ? (
            <Stack
              gap={6}
              pt="sm"
              align="center"
              style={{ borderTop: "1px solid var(--aei-bordure)" }}
            >
              <Tooltip label={`${userName ?? ""}${role ? ` — ${role}` : ""}`} position="right">
                <Avatar color="brand" radius="xl" size={34}>
                  {initiales(userName)}
                </Avatar>
              </Tooltip>
              <form action={signOutAction}>
                <Tooltip label="Se déconnecter" position="right">
                  <ActionIcon type="submit" variant="subtle" color="red" aria-label="Se déconnecter">
                    <LogOut size={16} />
                  </ActionIcon>
                </Tooltip>
              </form>
            </Stack>
          ) : (
            <Stack
              gap={6}
              pt="sm"
              px="xs"
              style={{ borderTop: "1px solid var(--aei-bordure)" }}
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
                  className="flex items-center gap-2 text-[13px] text-[var(--aei-texte-faible)] transition-colors hover:text-[var(--mantine-color-red-5)]"
                >
                  <LogOut size={14} /> Se déconnecter
                </button>
              </form>
            </Stack>
          )}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: "var(--aei-fond)" }}>
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
