"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatMontant } from "@/lib/format";

export type PointClassement = { nom: string; valeur: number };

export function ClassementChart({ data, couleur }: { data: PointClassement[]; couleur: string }) {
  const config: ChartConfig = {
    valeur: { label: "Montant", color: couleur },
  };

  const hauteur = Math.max(56 * data.length, 120);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: hauteur }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.5} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nom"
          tickLine={false}
          axisLine={false}
          width={110}
          className="text-xs"
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(value) => formatMontant(Number(value))} />}
        />
        <Bar dataKey="valeur" fill={couleur} radius={4} maxBarSize={24}>
          <LabelList
            dataKey="valeur"
            position="right"
            className="fill-foreground text-xs"
            formatter={(v?: unknown) => formatMontant(Number(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
