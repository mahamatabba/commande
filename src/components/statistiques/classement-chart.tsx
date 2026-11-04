"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@mantine/core";
import { GraphiqueVide } from "./graphique-vide";

export type PointClassement = { nom: string; valeur: number };

// Même raison que pour l'évolution : Recharts est chargé après la page.
// Voir le commentaire détaillé dans `evolution-chart.tsx`.
const ClassementChartInner = dynamic(() => import("./classement-chart-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-32 w-full" />,
});

export function ClassementChart({ data, couleur }: { data: PointClassement[]; couleur: string }) {
  if (data.length === 0 || data.every((p) => p.valeur === 0)) {
    return <GraphiqueVide message="Aucune donnée sur la période." hauteur={128} />;
  }
  return <ClassementChartInner data={data} couleur={couleur} />;
}
