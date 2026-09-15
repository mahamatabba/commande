"use client";

import { AppShell, Burger, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { SidebarNav } from "./sidebar-nav";
import type { NavItem } from "@/lib/nav";

export function DashboardShell({
  navItems,
  userName,
  userRole,
  signOutAction,
  children,
}: {
  navItems: NavItem[];
  userName?: string | null;
  userRole?: string | null;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 236, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="sm" hiddenFrom="sm">
              AEI — Gestion commerciale
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {userName}
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Group gap="sm" px="xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--mantine-color-dark-0)] text-[13px] font-semibold text-[var(--mantine-color-dark-9)]">
              AEI
            </div>
            <Text size="sm" fw={500}>
              AEI — Gestion commerciale
            </Text>
          </Group>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} mt="md">
          <SidebarNav items={navItems} onNavigate={close} />
        </AppShell.Section>

        <AppShell.Section>
          <Stack
            gap={2}
            pt="sm"
            px="xs"
            style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}
          >
            <Text size="10px" fw={600} c="dimmed" tt="uppercase">
              Session
            </Text>
            <Text size="sm" fw={600}>
              {userName}
            </Text>
            <Text size="xs" c="dimmed">
              {userRole}
            </Text>
            <form action={signOutAction}>
              <button
                type="submit"
                className="mt-1 text-[13px] text-[var(--mantine-color-dark-2)] transition-colors hover:text-[var(--mantine-color-text)] hover:underline"
              >
                Se déconnecter
              </button>
            </form>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
