"use client";

import { useActionState } from "react";
import { Button, PasswordInput, TextInput } from "@mantine/core";
import { connecter } from "./actions";

export default function PageConnexion() {
  const [erreur, action, enCours] = useActionState(connecter, undefined);

  return (
    <div className="grid min-h-screen md:grid-cols-[44%_1fr]">
      <div className="hidden flex-col justify-between bg-[var(--mantine-color-dark-8)] px-12 py-14 md:flex">
        <div>
          <div className="flex size-[38px] items-center justify-center rounded-md bg-[var(--mantine-color-dark-0)] text-sm font-semibold text-[var(--mantine-color-dark-9)]">
            AEI
          </div>
          <p className="mt-3 text-sm text-[var(--mantine-color-dark-2)]">
            Abdeldjalil Étude Informatique
          </p>
          <h1 className="mt-8 text-[30px] leading-tight font-semibold text-white">
            Gestion commerciale
          </h1>
          <p className="mt-3 max-w-[320px] text-[15px] leading-relaxed text-[var(--mantine-color-dark-2)]">
            Achats fournisseurs, ventes clients, facturation et caisse. Un
            seul registre, tenu à jour.
          </p>
        </div>
        <p className="font-mono text-xs text-[var(--mantine-color-dark-3)]">
          N&apos;Djaména, Tchad · exercice 2026
        </p>
      </div>

      <div className="flex items-center justify-center bg-[var(--mantine-color-dark-7)] px-6 py-14">
        <div className="w-full max-w-[380px]">
          <div className="mb-3 flex size-[38px] items-center justify-center rounded-md bg-[var(--mantine-color-brand-5)] text-sm font-semibold text-white md:hidden">
            AEI
          </div>
          <h2 className="text-[22px] font-semibold text-[var(--mantine-color-text)]">
            Connexion
          </h2>
          <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
            Identifiez-vous pour accéder au registre.
          </p>

          <form action={action} className="mt-8 space-y-4">
            <TextInput
              id="email"
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
            />
            <PasswordInput
              id="motDePasse"
              name="motDePasse"
              label="Mot de passe"
              required
              autoComplete="current-password"
            />
            {erreur && (
              <p className="text-sm text-[var(--mantine-color-red-5)]">{erreur}</p>
            )}
            <Button type="submit" loading={enCours} fullWidth size="md" mt="sm">
              Se connecter
            </Button>
          </form>

          <p className="mt-6 border-t border-[var(--mantine-color-dark-4)] pt-4 text-xs text-[var(--mantine-color-dimmed)]">
            Mot de passe oublié ? Contactez l&apos;administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}
