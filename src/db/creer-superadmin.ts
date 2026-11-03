import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

/**
 * Crée (ou rétablit) le compte « superadmin », avec le rôle ADMIN.
 *
 * Comme pour le seed, le mot de passe n'est jamais écrit dans le dépôt : il
 * est lu dans l'environnement.
 *
 *   SUPERADMIN_PASSWORD="..." npm run db:superadmin
 *
 * Variables :
 *   SUPERADMIN_PASSWORD  obligatoire, 12 caractères minimum
 *   SUPERADMIN_EMAIL     facultatif, « superadmin@aei.td » par défaut
 *   SUPERADMIN_NOM       facultatif, « Super Admin » par défaut
 *
 * Relancer le script sur un compte existant le remet en ADMIN actif (même
 * s'il avait été désactivé ou supprimé) et remplace son mot de passe : c'est
 * le moyen de reprendre la main si l'accès administrateur a été perdu.
 */

const LONGUEUR_MOT_DE_PASSE_MIN = 12;

async function main() {
  const motDePasse = process.env.SUPERADMIN_PASSWORD;
  if (!motDePasse) {
    throw new Error(
      "SUPERADMIN_PASSWORD est absent de l'environnement.\n" +
        '  SUPERADMIN_PASSWORD="votre-mot-de-passe-fort" npm run db:superadmin',
    );
  }
  if (motDePasse.length < LONGUEUR_MOT_DE_PASSE_MIN) {
    throw new Error(
      `SUPERADMIN_PASSWORD fait ${motDePasse.length} caractères ; ` +
        `${LONGUEUR_MOT_DE_PASSE_MIN} au minimum sont exigés.`,
    );
  }

  const email = (process.env.SUPERADMIN_EMAIL ?? "superadmin@aei.td").toLowerCase();
  const nomComplet = process.env.SUPERADMIN_NOM ?? "Super Admin";
  const passwordHash = await bcrypt.hash(motDePasse, 10);

  const [existant] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existant) {
    await db
      .update(users)
      .set({ nomComplet, passwordHash, role: "ADMIN", actif: true, supprime: false })
      .where(eq(users.id, existant.id));
    console.log(`Compte ${email} rétabli : rôle ADMIN, actif, mot de passe remplacé.`);
  } else {
    await db.insert(users).values({ email, nomComplet, passwordHash, role: "ADMIN", actif: true });
    console.log(`Compte ${email} créé avec le rôle ADMIN.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
