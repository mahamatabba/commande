import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Instance "légère" (edge-safe, sans provider) utilisée uniquement pour la
// protection des routes via le callback `authorized`.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protège tout sauf les routes d'API (dont /api/auth, nécessaire au flux
  // de connexion lui-même), les assets statiques et le favicon. /connexion
  // reste dans le périmètre : c'est le callback `authorized` qui la traite
  // comme page publique et redirige les utilisateurs déjà connectés.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
