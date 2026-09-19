import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * Interdit la notation pointée (`Table.Thead`) dans les composants serveur.
 *
 * @mantine/core est un paquet « use client ». Dans un composant serveur, le
 * symbole importé n'est pas le composant mais une référence vers le module
 * client ; `Table.Thead` fabrique alors une référence vers un export nommé
 * `Thead`, qui n'existe pas dans le paquet. Le rendu reçoit `undefined` et
 * casse (React #130), côté navigateur uniquement : rien dans les journaux
 * serveur, aucun digest sur l'écran d'erreur.
 *
 * Ni TypeScript ni `next lint` ne voient le problème — les types de Mantine
 * déclarent bien `Table.Thead`, c'est la sérialisation RSC qui casse. C'est
 * ce qui a permis au bug de survivre en production sur sept pages.
 *
 * Certains cas seraient pires que l'erreur : `Radio.Group` viserait l'export
 * `Group` de premier niveau, qui existe mais est le mauvais composant — page
 * silencieusement fausse, aucune erreur nulle part.
 *
 * Dans un fichier « use client » le module est réellement évalué côté
 * navigateur : la notation pointée y est valide et n'est pas signalée.
 */
const regleNotationPointee = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Impose les exports à plat de Mantine dans les composants serveur",
    },
    schema: [],
    messages: {
      interdite:
        "`{{ objet }}.{{ propriete }}` vaut `undefined` au rendu dans un composant " +
        "serveur. Importez le sous-composant à plat (`{{ objet }}{{ propriete }}`), " +
        'ou ajoutez "use client" si ce fichier doit être un composant navigateur.',
    },
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();

    // Le prologue seul fait foi : une directive placée après un import ou
    // une instruction est ignorée par le compilateur, donc par nous aussi.
    for (const noeud of source.ast.body) {
      if (
        noeud.type !== "ExpressionStatement" ||
        noeud.expression?.type !== "Literal" ||
        typeof noeud.expression.value !== "string"
      ) {
        break;
      }
      if (noeud.expression.value === "use client") return {};
    }

    return {
      JSXMemberExpression(noeud) {
        if (noeud.object?.type !== "JSXIdentifier") return;
        context.report({
          node: noeud,
          messageId: "interdite",
          data: { objet: noeud.object.name, propriete: noeud.property.name },
        });
      },
    };
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    files: ["src/**/*.tsx"],
    plugins: { aei: { rules: { "notation-pointee-serveur": regleNotationPointee } } },
    rules: { "aei/notation-pointee-serveur": "error" },
  },
];

export default eslintConfig;
