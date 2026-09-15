/**
 * Regénère `src/lib/pdf/logos.ts` à partir des PNG de `public/brand/`.
 *
 * À relancer après tout changement de logo :
 *
 *     node scripts/generer-logos-pdf.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

function dataUri(fichier) {
  const octets = readFileSync(join(racine, "public/brand", fichier));
  return `data:image/png;base64,${octets.toString("base64")}`;
}

const contenu = `/**
 * Les deux logos de l'en-tête, encodés en base64 dans le code source.
 *
 * Le rendu PDF a lieu dans une fonction serverless, qui ne contient que le
 * code tracé par le bundler — jamais le dossier \`public/\`, servi lui par le
 * CDN. Un \`readFileSync("public/brand/…")\` marcherait donc en local puis
 * échouerait une fois déployé, au moment précis où un commercial clique sur
 * « Aperçu ». Les images voyagent avec le code.
 *
 * Fichier généré : ne pas l'éditer à la main.
 * Régénération : \`node scripts/generer-logos-pdf.mjs\`.
 */

export const LOGO_AEI = "${dataUri("aei-icon.png")}";

export const LOGO_HP = "${dataUri("hp-logo.png")}";
`;

const cible = join(racine, "src/lib/pdf/logos.ts");
writeFileSync(cible, contenu);
console.log(`${cible} — ${contenu.length} caractères`);
