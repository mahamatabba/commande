import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` (utilisé par le pilote neon-serverless pour les transactions
  // interactives) doit rester en dehors du bundle webpack : sinon son
  // fallback interne pour les addons natifs optionnels (bufferutil,
  // utf-8-validate) est cassé, ce qui provoque "bufferUtil.mask is not
  // a function" au runtime.
  serverExternalPackages: ["ws"],
};

export default nextConfig;
