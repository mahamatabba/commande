"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type PointEvolution = { cle: string; label: string; valeur: number };

/**
 * Recharts pèse quelques centaines de kilo-octets, et le tableau de bord est
 * la première page ouverte après la connexion : chargée d'emblée, la
 * bibliothèque retardait l'affichage de tout le reste — chiffres, tableaux,
 * navigation — alors que le graphique n'est qu'un complément.
 *
 * On la charge donc à part, une fois la page utilisable. `ssr: false` évite
 * en plus de la rendre côté serveur pour rien : le graphique est
 * intrinsèquement client, ses dimensions étant mesurées dans le navigateur.
 */
const EvolutionChartInner = dynamic(() => import("./evolution-chart-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full" />,
});

export function EvolutionChart({
  data,
  couleur,
  libelleSerie,
}: {
  data: PointEvolution[];
  couleur: string;
  libelleSerie: string;
}) {
  return <EvolutionChartInner data={data} couleur={couleur} libelleSerie={libelleSerie} />;
}
