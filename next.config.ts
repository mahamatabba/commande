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
  // pdfkit charge ses polices standard via l'export "imports" de son
  // package.json (`#standard-fonts/*`), résolu à travers un `require` créé
  // dynamiquement (`module.createRequire`). Le traceur de fichiers de Vercel
  // ne suit pas cet appel indirect : `js/standard-fonts/*.cjs` est absent du
  // lambda déployé, ce qui fait échouer le tout premier rendu PDF en
  // production ("Cannot find module .../standard-fonts/Helvetica.cjs") sans
  // jamais se reproduire en local, où `node_modules` est complet. On force
  // donc leur inclusion pour les 4 routes qui génèrent un PDF.
  outputFileTracingIncludes: {
    "/factures/*/pdf": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
    "/commandes-client/*/pdf": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
    "/commandes-fournisseur/*/pdf": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
    "/proformas/*/pdf": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
  },
};

export default nextConfig;
