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

/**
 * Bleu de marque, construit autour du cyan du papier à en-tête (#00AEEF,
 * celui du filet et du logo partenaire). Teinte 7 en couleur primaire : assez
 * soutenue pour porter un texte blanc lisible sur les boutons.
 */
const brand: MantineColorsTuple = [
  "#E1F6FE",
  "#B9EAFC",
  "#8DDCFA",
  "#5FCDF6",
  "#36BFF2",
  "#14B2EE",
  "#00A0DA",
  "#008ABF",
  "#0075A3",
  "#005E84",
];

/** Orange AEI (logo, filet du papier à en-tête), pour les accents. */
const aei: MantineColorsTuple = [
  "#FFF3E6",
  "#FFE3C4",
  "#FDD09C",
  "#FBBD75",
  "#FAAF5E",
  "#FAA755",
  "#E8913B",
  "#C9772A",
  "#A65E1F",
  "#824815",
];

export const theme = createTheme({
  colors: { dark, brand, aei },
  primaryColor: "brand",
  primaryShade: { light: 7, dark: 7 },
  defaultRadius: "md",
  fontFamily: "var(--font-sans)",
  fontFamilyMonospace: "var(--font-mono)",
  headings: { fontFamily: "var(--font-sans)", fontWeight: "700" },
  components: {
    Card: { defaultProps: { shadow: "sm" } },
    Paper: { defaultProps: { shadow: "xs" } },
    Button: { defaultProps: { radius: "md" } },
  },
});
