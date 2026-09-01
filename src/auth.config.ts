import type { NextAuthConfig } from "next-auth";

/**
 * Configuration "edge-safe" : ne doit rien importer qui dépende de Node
 * (bcrypt, le client Neon...) car elle est aussi utilisée par le middleware,
 * qui tourne dans l'Edge Runtime. Le provider Credentials (qui a besoin de
 * bcrypt et de la base) est ajouté séparément dans `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/connexion",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const estConnecte = !!auth?.user;
      const surConnexion = request.nextUrl.pathname === "/connexion";

      // Un utilisateur déjà connecté qui arrive sur /connexion est renvoyé
      // vers le tableau de bord.
      if (surConnexion) {
        if (estConnecte) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      // Toutes les autres pages appartiennent au groupe de routes
      // `(dashboard)` : ce groupe n'apparaît pas dans l'URL, donc on ne peut
      // pas filtrer sur un préfixe — on protège par défaut tout sauf
      // /connexion (voir le matcher dans middleware.ts pour ce qui est
      // exclu en amont : /api, les assets statiques...).
      return estConnecte && auth.user.actif !== false;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.actif = user.actif;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.actif = token.actif;
      return session;
    },
  },
  providers: [], // renseignés dans src/auth.ts
} satisfies NextAuthConfig;
