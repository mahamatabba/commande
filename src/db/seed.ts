import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import * as schema from "./schema";

/**
 * Le mot de passe de l'administrateur initial n'est JAMAIS écrit dans ce
 * fichier : il serait versionné, donc lisible par toute personne ayant accès
 * au dépôt, et il resterait lisible dans l'historique Git même après
 * suppression. Il est lu dans l'environnement et le script refuse de démarrer
 * sans lui.
 *
 *   SEED_ADMIN_PASSWORD="..." npm run db:seed
 *
 * Les jeux de démonstration (fournisseurs, clients) ne sont insérés que si
 * leur table est vide : relancer le seed sur une base déjà alimentée ne doit
 * rien dupliquer.
 */

const LONGUEUR_MOT_DE_PASSE_MIN = 12;

function lireMotDePasseAdmin(): string {
  const motDePasse = process.env.SEED_ADMIN_PASSWORD;

  if (!motDePasse) {
    throw new Error(
      "SEED_ADMIN_PASSWORD est absent de l'environnement.\n" +
        "Définissez-le avant de lancer le seed, par exemple dans .env.local :\n" +
        '  SEED_ADMIN_PASSWORD="votre-mot-de-passe-fort"',
    );
  }

  if (motDePasse.length < LONGUEUR_MOT_DE_PASSE_MIN) {
    throw new Error(
      `SEED_ADMIN_PASSWORD fait ${motDePasse.length} caractères ; ` +
        `${LONGUEUR_MOT_DE_PASSE_MIN} au minimum sont exigés.`,
    );
  }

  return motDePasse;
}

const EMAIL_ADMIN = process.env.SEED_ADMIN_EMAIL ?? "admin@aei.td";

async function tableVide(
  table: typeof schema.fournisseurs | typeof schema.clients,
): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return (row?.n ?? 0) === 0;
}

async function main() {
  const motDePasseHache = await bcrypt.hash(lireMotDePasseAdmin(), 10);

  console.log("Seed : création de l'administrateur par défaut...");
  await db
    .insert(schema.users)
    .values({
      email: EMAIL_ADMIN,
      passwordHash: motDePasseHache,
      nomComplet: "Administrateur AEI",
      role: "ADMIN",
      actif: true,
    })
    .onConflictDoNothing({ target: schema.users.email });

  console.log("Seed : création des articles...");
  await db
    .insert(schema.articles)
    .values([
      {
        code: "ART-001",
        designation: "Ordinateur portable HP 15\"",
        prixAchatIndicatif: 350000,
        prixVente: 420000,
      },
      {
        code: "ART-002",
        designation: "Imprimante laser monochrome",
        prixAchatIndicatif: 90000,
        prixVente: 120000,
      },
      {
        code: "ART-003",
        designation: "Onduleur 650VA",
        prixAchatIndicatif: 25000,
        prixVente: 38000,
      },
    ])
    .onConflictDoNothing({ target: schema.articles.code });

  // Ni `fournisseurs.nom` ni `clients.nom` ne sont uniques en base — il est
  // légitime d'avoir deux homonymes. onConflictDoNothing n'a donc rien à
  // cibler : on se contente de ne pas réinsérer si la table est déjà peuplée.
  if (await tableVide(schema.fournisseurs)) {
    console.log("Seed : création des fournisseurs de démonstration...");
    await db.insert(schema.fournisseurs).values([
      {
        nom: "SODICOM Tchad",
        adresse: "Avenue Charles de Gaulle, N'Djaména",
        telephone: "+235 66 00 00 01",
        email: "contact@sodicom.td",
        nif: "TD-NIF-100001",
      },
      {
        nom: "Sahel Informatique",
        adresse: "Quartier Klemat, N'Djaména",
        telephone: "+235 66 00 00 02",
        email: null,
        nif: null,
      },
    ]);
  } else {
    console.log("Seed : fournisseurs déjà présents, insertion ignorée.");
  }

  if (await tableVide(schema.clients)) {
    console.log("Seed : création des clients de démonstration...");
    await db.insert(schema.clients).values([
      {
        nom: "Ministère de l'Éducation",
        raisonSociale: "Ministère de l'Éducation Nationale",
        telephone: "+235 66 11 11 01",
        nif: "TD-NIF-200001",
        exonereTva: true,
      },
      {
        nom: "Moussa",
        prenom: "Ali",
        telephone: "+235 66 11 11 02",
      },
      {
        nom: "Ngarta",
        prenom: "Fatimé",
        telephone: "+235 66 11 11 03",
      },
    ]);
  } else {
    console.log("Seed : clients déjà présents, insertion ignorée.");
  }

  console.log("Seed terminé.");
}

main()
  .then(() => process.exit(0))
  .catch((erreur) => {
    console.error(erreur instanceof Error ? erreur.message : erreur);
    process.exit(1);
  });
