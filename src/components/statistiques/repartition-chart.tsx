"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@mantine/core";
import { GraphiqueVide } from "./graphique-vide";

// Même raison que pour l'évolution : Recharts est chargé après la page.
// Voir le commentaire détaillé dans `evolution-chart.tsx`.
const RepartitionChartInner = dynamic(() => import("./repartition-chart-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-24 w-full" />,
});

export function RepartitionChart({
  especes,
  bonDeCommande,
  couleurEspeces,
  couleurBonDeCommande,
}: {
  especes: number;
  bonDeCommande: number;
  couleurEspeces: string;
  couleurBonDeCommande: string;
}) {
  if (especes + bonDeCommande === 0) {
    return <GraphiqueVide message="Aucune vente sur la période." hauteur={96} />;
  }
  return (
    <RepartitionChartInner
      especes={especes}
      bonDeCommande={bonDeCommande}
      couleurEspeces={couleurEspeces}
      couleurBonDeCommande={couleurBonDeCommande}
    />
  );
}
