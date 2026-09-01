import type { Role } from "@/lib/permissions";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    actif: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      actif: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    actif: boolean;
  }
}

// "next-auth/jwt" ne fait que ré-exporter (`export *`) l'interface JWT
// déclarée dans "@auth/core/jwt" : le merge de déclaration ne traverse pas
// cette ré-export, il faut donc augmenter aussi le module d'origine.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    actif: boolean;
  }
}
