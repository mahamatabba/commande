import { and, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { mouvementsCaisse } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { calculerSoldeCaisse } from "@/lib/caisse";
import { formatDate, formatMontant } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatTile } from "@/components/statistiques/stat-tile";

const SENS_LABEL: Record<string, string> = {
  ENCAISSEMENT: "Encaissement",
  DECAISSEMENT: "Décaissement",
};

const SENS_CLASS: Record<string, string> = {
  ENCAISSEMENT: "bg-[#E7F0EB] text-[#14563E] border-[#BEDACD]",
  DECAISSEMENT: "bg-[#F8E8E6] text-[#8A211C] border-[#E3BEBB]",
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageCaisse({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "caisse:solde:read");
  const { du, au } = await searchParams;

  const solde = await calculerSoldeCaisse(db);

  const conditions = [];
  if (du) conditions.push(gte(mouvementsCaisse.dateMouvement, new Date(du)));
  if (au) conditions.push(lte(mouvementsCaisse.dateMouvement, new Date(`${au}T23:59:59`)));

  const mouvements = await db.query.mouvementsCaisse.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      reglement: {
        with: {
          facture: { with: { client: true } },
          commandeFournisseur: { with: { fournisseur: true } },
        },
      },
    },
    orderBy: (m, { desc }) => [desc(m.dateMouvement)],
    limit: 200,
  });

  const totalEncaissements = mouvements
    .filter((m) => m.sens === "ENCAISSEMENT")
    .reduce((s, m) => s + m.montant, 0);
  const totalDecaissements = mouvements
    .filter((m) => m.sens === "DECAISSEMENT")
    .reduce((s, m) => s + m.montant, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Caisse</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Solde actuel" montant={solde} highlight />
        <StatTile label="Encaissements affichés" montant={totalEncaissements} />
        <StatTile label="Décaissements affichés" montant={totalDecaissements} />
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="du">Du</Label>
          <Input id="du" name="du" type="date" defaultValue={du} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="au">Au</Label>
          <Input id="au" name="au" type="date" defaultValue={au} />
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Sens</TableHead>
              <TableHead>Origine</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Solde après</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mouvements.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatDate(m.dateMouvement)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={SENS_CLASS[m.sens]}>
                    {SENS_LABEL[m.sens]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {m.reglement.facture
                    ? `Facture ${m.reglement.facture.numero} — ${nomAffiche(m.reglement.facture.client)}`
                    : m.reglement.commandeFournisseur
                      ? `Achat ${m.reglement.commandeFournisseur.numero} — ${m.reglement.commandeFournisseur.fournisseur.nom}`
                      : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMontant(m.montant)}</TableCell>
                <TableCell className="text-right font-mono font-medium tabular-nums">
                  {formatMontant(m.soldeApres)}
                </TableCell>
              </TableRow>
            ))}
            {mouvements.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  Aucun mouvement de caisse.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
