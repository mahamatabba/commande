"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function connecter(
  _etatPrecedent: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      motDePasse: formData.get("motDePasse"),
      redirectTo: "/dashboard",
    });
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      switch (erreur.type) {
        case "CredentialsSignin":
          return "Email ou mot de passe incorrect.";
        default:
          return "Une erreur est survenue lors de la connexion.";
      }
    }
    throw erreur;
  }
}
