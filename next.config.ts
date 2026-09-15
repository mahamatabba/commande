import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` (utilisé par le pilote neon-serverless pour les transactions
  // interactives) doit rester en dehors du bundle webpack : sinon son
  // fallback interne pour les addons natifs optionnels (bufferutil,
  // utf-8-validate) est cassé, ce qui provoque "bufferUtil.mask is not
  // a function" au runtime.
  // `@react-pdf/renderer` embarque pdfkit et fontkit, qui lisent leurs
  // métriques de polices depuis des fichiers de données et chargent des
  // modules Node par nom. Bundlés, ces accès sont réécrits et échouent au
  // rendu du premier PDF — pas à la compilation. On les laisse donc hors du
  // bundle, comme `ws`.
  serverExternalPackages: ["ws", "@react-pdf/renderer"],
};

export default nextConfig;
