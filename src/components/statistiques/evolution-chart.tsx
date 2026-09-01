"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatMontant } from "@/lib/format";

export type PointEvolution = { cle: string; label: string; valeur: number };

export function EvolutionChart({
  data,
  couleur,
  libelleSerie,
}: {
  data: PointEvolution[];
  couleur: string;
  libelleSerie: string;
}) {
  const config: ChartConfig = {
    valeur: { label: libelleSerie, color: couleur },
  };

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={70}
          tickFormatter={(v: number) => formatMontant(v)}
          className="text-xs"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatMontant(Number(value))}
            />
          }
        />
        <Area
          dataKey="valeur"
          type="monotone"
          fill={couleur}
          fillOpacity={0.1}
          stroke={couleur}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
