"use client";

import Link from "next/link";
import { AlertTriangle, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DIGEST_ACCES_REFUSE } from "@/lib/permissions";

export type ErreurAffichable = Error & { digest?: string };

/**
 * Écran d'erreur commun à toutes les frontières d'erreur de l'application.
 *
 * Il sépare deux situations que l'utilisateur ne doit pas confondre :
 * un accès refusé (il n'a pas le droit, rien n'est cassé) et une panne
 * technique (l'action n'a pas abouti, il faut réessayer ou alerter).
 */
export function EcranErreur({
  erreur,
  reessayer,
}: {
  erreur: ErreurAffichable;
  reessayer?: () => void;
}) {
  const accesRefuse = erreur.digest === DIGEST_ACCES_REFUSE;

  const Icone = accesRefuse ? Lock : AlertTriangle;
  const titre = accesRefuse ? "Accès refusé" : "Une erreur est survenue";
  const explication = accesRefuse
    ? "Votre rôle ne donne pas accès à cet écran. Si vous pensez que c'est une erreur, demandez à l'administrateur de vérifier vos droits."
    : "L'écran n'a pas pu être chargé. Aucune donnée n'a été modifiée. Réessayez ; si le problème persiste, signalez-le à l'administrateur.";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-[2px] border border-border bg-card p-8">
        <div
          className={
            accesRefuse
              ? "inline-flex rounded-[2px] border border-[#C6D2E0] bg-[#EEF2F7] p-2 text-[#1E3A5F]"
              : "inline-flex rounded-[2px] border border-[#E3BEBB] bg-[#F8E8E6] p-2 text-[#A32A24]"
          }
        >
          <Icone className="size-5" aria-hidden />
        </div>

        <h1 className="mt-4 text-xl font-semibold">{titre}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{explication}</p>

        {!accesRefuse && erreur.digest && (
          <p className="mt-4 font-mono text-xs tabular-nums text-muted-foreground">
            Référence technique : {erreur.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {!accesRefuse && reessayer && (
            <Button onClick={reessayer}>
              <RotateCcw />
              Réessayer
            </Button>
          )}
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}
