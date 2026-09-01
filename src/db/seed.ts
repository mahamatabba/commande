import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import * as schema from "./schema";

async function main() {
  console.log("Seed : création de l'administrateur par défaut...");

  const motDePasseHache = await bcrypt.hash("admin1234", 10);

  await db
    .insert(schema.users)
    .values({
      email: "admin@aei.td",
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
        tauxTva: 18,
      },
      {
        code: "ART-002",
        designation: "Imprimante laser monochrome",
        prixAchatIndicatif: 90000,
        prixVente: 120000,
        tauxTva: 18,
      },
      {
        code: "ART-003",
        designation: "Onduleur 650VA",
        prixAchatIndicatif: 25000,
        prixVente: 38000,
        tauxTva: 18,
      },
    ])
    .onConflictDoNothing({ target: schema.articles.code });

  console.log("Seed : création des fournisseurs...");
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

  console.log("Seed : création des clients...");
  await db.insert(schema.clients).values([
    {
      nom: "Ministère de l'Éducation",
      raisonSociale: "Ministère de l'Éducation Nationale",
      telephone: "+235 66 11 11 01",
      nif: "TD-NIF-200001",
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

  console.log("Seed terminé.");
}

main()
  .then(() => process.exit(0))
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  });
