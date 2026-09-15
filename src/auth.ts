import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { users } from "./db/schema";
import { tracerActivite } from "./lib/journal";

const identifiantsSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(1),
});

/**
 * Intervalle minimal entre deux relectures du compte en base.
 *
 * Le jeton JWT est sans état : sans relecture, un changement de nom, de rôle
 * ou une désactivation faite via `modifierUtilisateur` ne serait visible par
 * l'utilisateur concerné qu'après une déconnexion/reconnexion.
 *
 * Mais relire à CHAQUE lecture de session revenait à payer un aller-retour
 * vers la base à chaque affichage de page, avant même les données de l'écran
 * demandé — depuis N'Djaména, plusieurs centaines de millisecondes ajoutées
 * à toute navigation. On borne donc la fraîcheur plutôt que de la garantir à
 * l'instant près : une révocation prend effet en moins d'une minute, ce qui
 * reste immédiat à l'échelle humaine, et la navigation courante ne paie plus
 * qu'une requête par minute au lieu d'une par page.
 */
const DELAI_REVERIFICATION_MS = 60_000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.actif = user.actif;
        token.verifieLe = Date.now();
        return token;
      }

      if (!token.id) return token;

      const expire =
        token.verifieLe === undefined ||
        Date.now() - token.verifieLe >= DELAI_REVERIFICATION_MS;
      if (!expire) return token;

      try {
        const [utilisateur] = await db
          .select({
            nomComplet: users.nomComplet,
            role: users.role,
            actif: users.actif,
          })
          .from(users)
          .where(eq(users.id, Number(token.id)))
          .limit(1);

        if (!utilisateur) {
          token.actif = false;
        } else {
          token.name = utilisateur.nomComplet;
          token.role = utilisateur.role;
          token.actif = utilisateur.actif;
        }
        token.verifieLe = Date.now();
      } catch {
        // Base injoignable : on conserve le jeton tel quel plutôt que de
        // déconnecter tout le monde. Sans ce filet, une coupure réseau
        // passagère renverrait l'utilisateur sur l'écran de connexion au
        // milieu d'une saisie. `verifieLe` n'est pas rafraîchi : la
        // vérification sera retentée à la navigation suivante.
      }

      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        motDePasse: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = identifiantsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, motDePasse } = parsed.data;

        const [utilisateur] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!utilisateur || !utilisateur.actif) return null;

        const motDePasseValide = await bcrypt.compare(
          motDePasse,
          utilisateur.passwordHash,
        );
        if (!motDePasseValide) return null;

        return {
          id: String(utilisateur.id),
          email: utilisateur.email,
          name: utilisateur.nomComplet,
          role: utilisateur.role,
          actif: utilisateur.actif,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      await tracerActivite(db, {
        userId: Number(user.id),
        action: "connexion",
        entite: "utilisateur",
        entiteId: Number(user.id),
      });
    },
  },
});
