"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Button, PasswordInput, TextInput } from "@mantine/core";
import { connecter } from "./actions";

export default function PageConnexion() {
  const [erreur, action, enCours] = useActionState(connecter, undefined);

  return (
    <div className="grid min-h-screen md:grid-cols-[44%_1fr]">
      <div
        className="relative hidden flex-col justify-between overflow-hidden px-12 py-14 md:flex"
        style={{
          background:
            "radial-gradient(circle at 15% 10%, rgba(0,174,239,0.22), transparent 45%), radial-gradient(circle at 90% 95%, rgba(250,167,85,0.22), transparent 45%), #0C1622",
        }}
      >
        <div>
          <div className="flex items-center gap-4">
            <span className="flex h-[84px] w-[96px] items-center justify-center rounded-xl bg-white p-2 shadow-lg">
              <Image src="/brand/aei-icon.png" alt="Logo AEI" width={248} height={215} priority className="h-full w-auto" />
            </span>
            <div>
              <p className="text-[17px] leading-tight font-bold tracking-wide text-white">
                ABDELDJELIL ÉTUDE INFORMATIQUE
              </p>
              <p className="mt-1 text-sm font-medium text-[#00AEEF]">Partenaire agréé HP</p>
            </div>
          </div>
          <h1 className="mt-14 text-[34px] leading-tight font-bold text-white">
            Gestion commerciale
          </h1>
          <div className="mt-3 h-1 w-14 rounded bg-[#FAA755]" />
          <p className="mt-5 max-w-[360px] text-[15px] leading-relaxed text-[#C7D2DE]">
            Bons de commande fournisseurs, ventes, proformas, factures et caisse.
            Un seul registre, tenu à jour.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#A9BBD1]">
            Avenue Charles de Gaulle · N&apos;Djaména, Tchad
          </p>
          <span className="flex size-11 items-center justify-center rounded-full bg-white p-1">
            <Image src="/brand/hp-logo.png" alt="HP" width={66} height={66} className="h-full w-full" />
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[var(--aei-surface)] px-6 py-14">
        <div className="w-full max-w-[380px]">
          <span className="mb-5 flex h-[64px] w-[74px] items-center justify-center rounded-xl bg-white p-1.5 md:hidden">
            <Image src="/brand/aei-icon.png" alt="Logo AEI" width={248} height={215} className="h-full w-auto" />
          </span>
          <h2 className="text-[26px] font-bold text-[var(--mantine-color-text)]">
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

          <p className="mt-6 border-t border-[var(--aei-bordure)] pt-4 text-xs text-[var(--mantine-color-dimmed)]">
            Mot de passe oublié ? Contactez l&apos;administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}
