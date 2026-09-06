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

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Le strategy JWT est sans état : sans ce ré-override (impossible dans
    // auth.config.ts, qui doit rester dépourvu de dépendances Node/DB pour
    // le middleware edge), un changement de nom/rôle/statut fait via
    // `modifierUtilisateur` ne serait visible par l'utilisateur concerné
    // qu'après une déconnexion/reconnexion.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.actif = user.actif;
        return token;
      }

      if (token.id) {
        const [utilisateur] = await db
          .select()
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
