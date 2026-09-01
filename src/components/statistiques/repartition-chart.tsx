"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMontant } from "@/lib/format";

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
  const config: ChartConfig = {
    especes: { label: "Espèces", color: couleurEspeces },
    bonDeCommande: { label: "Bon de commande", color: couleurBonDeCommande },
  };
  const data = [{ categorie: "Commandes", especes, bonDeCommande }];

  return (
    <ChartContainer config={config} className="aspect-auto h-24 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }} barSize={24}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="categorie" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value) => formatMontant(Number(value))} />}
        />
        <Bar dataKey="especes" stackId="a" fill={couleurEspeces} radius={[4, 0, 0, 4]}>
          <LabelList dataKey="especes" position="insideLeft" className="fill-white text-xs" formatter={(v?: unknown) => formatMontant(Number(v))} />
        </Bar>
        <Bar dataKey="bonDeCommande" stackId="a" fill={couleurBonDeCommande} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="bonDeCommande" position="insideRight" className="fill-white text-xs" formatter={(v?: unknown) => formatMontant(Number(v))} />
        </Bar>
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
