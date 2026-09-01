import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { formatMontant } from "@/lib/format";

export function StatTile({
  label,
  montant,
  note,
  highlight = false,
}: {
  label: string;
  montant: number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-primary bg-primary text-primary-foreground")}>
      <CardContent className="space-y-1">
        <p className={cn("text-sm", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {label}
        </p>
        <p
          className={cn(
            "font-mono font-semibold tabular-nums",
            highlight ? "text-3xl" : "text-2xl",
          )}
        >
          {formatMontant(montant)}
        </p>
        {note && (
          <p className={cn("text-xs", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
