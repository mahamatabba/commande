"use client";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { DatesProvider } from "@mantine/dates";
import "dayjs/locale/fr";
import { theme } from "@/lib/mantine-theme";

export function AppColorSchemeScript() {
  return <ColorSchemeScript defaultColorScheme="dark" />;
}

export function AppMantineProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <DatesProvider settings={{ locale: "fr", firstDayOfWeek: 1 }}>
        {children}
        <Notifications position="top-right" />
      </DatesProvider>
    </MantineProvider>
  );
}
