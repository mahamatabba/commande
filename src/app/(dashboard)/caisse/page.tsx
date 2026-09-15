import { redirect } from "next/navigation";
import { and, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { mouvementsCaisse } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { calculerSoldeCaisse } from "@/lib/caisse";
import { formatDate, formatMontant } from "@/lib/format";
import { bornerDebut, bornerFin, bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { SENS_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatTile } from "@/components/statistiques/stat-tile";
import { PaginationListe } from "@/components/shared/pagination-liste";

/** Nombre de mouvements affichés par page. */
const PAR_PAGE = 100;

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
  searchParams: Promise<{ du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "caisse:solde:read");
  const params = await searchParams;
  const { du, au } = params;

  const debut = bornerDebut(du);
  const fin = bornerFin(au);
  const conditions = [];
  if (debut) conditions.push(gte(mouvementsCaisse.dateMouvement, debut));
  if (fin) conditions.push(lte(mouvementsCaisse.dateMouvement, fin));
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  // Le solde global et les totaux de la période sont indépendants : lancés
  // ensemble, ils ne coûtent qu'un aller-retour au lieu de deux.
  //
  // Totaux et comptage sont calculés en base sur TOUTE la période demandée :
  // les additionner à partir des seules lignes chargées donnait un « total »
  // qui changeait au fil de la pagination.
  const [solde, agregatsRows] = await Promise.all([
    calculerSoldeCaisse(db),
    db
      .select({
        encaissements: sql<string>`COALESCE(SUM(CASE WHEN ${mouvementsCaisse.sens} = 'ENCAISSEMENT' THEN ${mouvementsCaisse.montant} ELSE 0 END), 0)`,
        decaissements: sql<string>`COALESCE(SUM(CASE WHEN ${mouvementsCaisse.sens} = 'DECAISSEMENT' THEN ${mouvementsCaisse.montant} ELSE 0 END), 0)`,
        nombre: sql<number>`count(*)::int`,
      })
      .from(mouvementsCaisse)
      .where(filtre),
  ]);

  const agregats = agregatsRows[0];
  const totalEncaissements = Number(agregats?.encaissements ?? 0);
  const totalDecaissements = Number(agregats?.decaissements ?? 0);
  const nombreMouvements = agregats?.nombre ?? 0;
  const pageDemandee = lirePage(params.page);
  const { nbPages, pageCourante, decalage } = bornerPagination(
    pageDemandee,
    nombreMouvements,
    PAR_PAGE,
  );
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/caisse", params, pageCourante));
  }

  const mouvements = await db.query.mouvementsCaisse.findMany({
    where: filtre,
    with: {
      reglement: {
        with: {
          facture: { with: { client: true } },
          commandeFournisseur: { with: { fournisseur: true } },
        },
      },
    },
    // L'`id` départage les mouvements d'une même journée, sinon l'ordre varie
    // d'une requête à l'autre et le solde progressif devient incohérent.
    orderBy: (m, { desc }) => [desc(m.dateMouvement), desc(m.id)],
    limit: PAR_PAGE,
    offset: decalage,
  });

  // Solde progressif recalculé chronologiquement. La colonne `soldeApres`
  // stockée suit l'ordre de SAISIE : un règlement antidaté la rend fausse à
  // l'affichage. On repart donc du solde cumulé juste avant la plus ancienne
  // ligne affichée, puis on remonte.
  const plusAncien = mouvements.at(-1);
  let cumul = 0;
  if (plusAncien) {
    const [row] = await db
      .select({
        solde: sql<string>`COALESCE(SUM(CASE WHEN ${mouvementsCaisse.sens} = 'ENCAISSEMENT' THEN ${mouvementsCaisse.montant} ELSE -${mouvementsCaisse.montant} END), 0)`,
      })
      .from(mouvementsCaisse)
      .where(
        sql`(${mouvementsCaisse.dateMouvement}, ${mouvementsCaisse.id}) < (${plusAncien.dateMouvement}, ${plusAncien.id})`,
      );
    cumul = Number(row?.solde ?? 0);
  }

  const soldeParMouvement = new Map<number, number>();
  for (const m of [...mouvements].reverse()) {
    cumul += m.sens === "ENCAISSEMENT" ? m.montant : -m.montant;
    soldeParMouvement.set(m.id, cumul);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Caisse</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Solde actuel" montant={solde} highlight />
        <StatTile label="Encaissements de la période" montant={totalEncaissements} />
        <StatTile label="Décaissements de la période" montant={totalDecaissements} />
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
                    {libelle(SENS_REGLEMENT_LABEL, m.sens)}
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
                  {formatMontant(soldeParMouvement.get(m.id) ?? m.soldeApres)}
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

      <PaginationListe
        base="/caisse"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={nombreMouvements}
        nom="mouvement"
      />
    </div>
  );
}
