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
