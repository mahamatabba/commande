"use client";

import { useActionState } from "react";
import { connecter } from "./actions";

export default function PageConnexion() {
  const [erreur, action, enCours] = useActionState(connecter, undefined);

  return (
    <div className="grid min-h-screen md:grid-cols-[44%_1fr]">
      <div className="hidden flex-col justify-between bg-[#172E48] px-12 py-14 md:flex">
        <div>
          <div className="flex size-[38px] items-center justify-center rounded-[2px] bg-[#E8EDF4] text-sm font-semibold text-[#172E48]">
            AEI
          </div>
          <p className="mt-3 text-sm text-[#A9BBD1]">
            Abdeldjalil Étude Informatique
          </p>
          <h1 className="mt-8 text-[30px] leading-tight font-semibold text-white">
            Gestion commerciale
          </h1>
          <p className="mt-3 max-w-[320px] text-[15px] leading-relaxed text-[#A9BBD1]">
            Achats fournisseurs, ventes clients, facturation et caisse. Un
            seul registre, tenu à jour.
          </p>
        </div>
        <p className="font-mono text-xs text-[#7E93AE]">
          N&apos;Djaména, Tchad · exercice 2026
        </p>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-14">
        <div className="w-full max-w-[380px]">
          <div className="mb-3 flex size-[38px] items-center justify-center rounded-[2px] bg-primary text-sm font-semibold text-primary-foreground md:hidden">
            AEI
          </div>
          <h2 className="text-[22px] font-semibold text-foreground">
            Connexion
          </h2>
          <p className="mt-1 text-sm text-[#6B6862]">
            Identifiez-vous pour accéder au registre.
          </p>

          <form action={action} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-[#4A4844]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-[2px] border border-[#C9C5BE] px-3 py-2.75 text-[15px] outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/20"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="motDePasse"
                className="text-xs font-semibold text-[#4A4844]"
              >
                Mot de passe
              </label>
              <input
                id="motDePasse"
                name="motDePasse"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-[2px] border border-[#C9C5BE] px-3 py-2.75 text-[15px] outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/20"
              />
            </div>
            {erreur && <p className="text-sm text-[#8A211C]">{erreur}</p>}
            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded-[2px] bg-primary px-4 py-3.25 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_12%)] disabled:opacity-50"
            >
              {enCours ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-6 border-t border-[#E6E3DD] pt-4 text-xs text-[#6B6862]">
            Mot de passe oublié ? Contactez l&apos;administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}
