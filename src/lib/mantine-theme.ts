import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * Les deux teintes ci-dessous reprennent telles quelles les couleurs du bloc
 * `.dark` de `globals.css`, déjà présentes dans l'app mais jamais branchées à
 * l'écran. Les couleurs sémantiques (succès/alerte/danger) restent celles de
 * Mantine par défaut : elles sont déjà proches des couleurs de graphique
 * existantes (`#4FAE84`, `#D69A3D`, `#C6564C`) et déjà éprouvées en thème
 * sombre — les redéfinir n'aurait rien apporté.
 */
const dark: MantineColorsTuple = [
  "#E8EDF4",
  "#C7D2DE",
  "#A9BBD1",
  "#7E93AE",
  "#2C4463",
  "#1F3549",
  "#16283A",
  "#11202F",
  "#0C1622",
  "#080F17",
];

const brand: MantineColorsTuple = [
  "#EAF1F8",
  "#D3E3F1",
  "#B6D0E7",
  "#98BDDD",
  "#82AED4",
  "#6E9BC7",
  "#5C89B5",
  "#4A729B",
  "#385880",
  "#274063",
];

export const theme = createTheme({
  colors: { dark, brand },
  primaryColor: "brand",
  primaryShade: 5,
  defaultRadius: "md",
  fontFamily: "var(--font-sans)",
  fontFamilyMonospace: "var(--font-mono)",
  headings: { fontFamily: "var(--font-sans)" },
});
