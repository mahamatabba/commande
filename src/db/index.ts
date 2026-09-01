import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL n'est pas défini.");
}

// Le pilote neon-http ne supporte pas les transactions interactives
// (BEGIN/COMMIT multi-requêtes). Plusieurs règles métier exigent une vraie
// transaction (numérotation + création de facture + règlement + mouvement
// de caisse en une seule unité atomique) : on utilise donc neon-serverless,
// qui ouvre une connexion WebSocket compatible avec les fonctions
// serverless Vercel tout en supportant `db.transaction()`.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

/** Type de l'objet `tx` reçu à l'intérieur de `db.transaction(async (tx) => ...)`. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
