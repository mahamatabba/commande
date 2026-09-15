"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type PointClassement = { nom: string; valeur: number };

// Même raison que pour l'évolution : Recharts est chargé après la page.
// Voir le commentaire détaillé dans `evolution-chart.tsx`.
const ClassementChartInner = dynamic(() => import("./classement-chart-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-32 w-full" />,
});

export function ClassementChart({ data, couleur }: { data: PointClassement[]; couleur: string }) {
  return <ClassementChartInner data={data} couleur={couleur} />;
}
