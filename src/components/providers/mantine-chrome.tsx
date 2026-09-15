"use client";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/lib/mantine-theme";

export function AppColorSchemeScript() {
  return <ColorSchemeScript forceColorScheme="dark" />;
}

export function AppMantineProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      {children}
      <Notifications position="top-right" />
    </MantineProvider>
  );
}
