import { Card, CardContent } from "@/components/ui/card";
import { formatMontant } from "@/lib/format";

export function StatTile({ label, montant, note }: { label: string; montant: number; note?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{formatMontant(montant)}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
