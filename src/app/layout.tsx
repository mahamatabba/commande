import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppColorSchemeScript, AppMantineProvider } from "@/components/providers/mantine-chrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AEI — Gestion commerciale",
  description: "Application de gestion commerciale — Abdeldjalil Étude Informatique",
};

const mantineHtmlProps = {
  suppressHydrationWarning: true,
  "data-mantine-color-scheme": "dark",
} as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      {...mantineHtmlProps}
    >
      <head>
        <AppColorSchemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <AppMantineProvider>{children}</AppMantineProvider>
      </body>
    </html>
  );
}
