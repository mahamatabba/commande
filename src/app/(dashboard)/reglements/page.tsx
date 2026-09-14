import Link from "next/link";
import { eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, factures, clients, fournisseurs, reglements } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { lirePage } from "@/lib/filtres";
import { MOYEN_REGLEMENT_LABEL, SENS_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReglementForm } from "@/components/reglements/reglement-form";

/** Nombre de règlements affichés par page dans l'historique. */
const PAR_PAGE = 50;

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageReglements({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "reglements:saisir");

  const page = lirePage((await searchParams).page);

  const facturesEligibles = await db
    .select({
      id: factures.id,
      numero: factures.numero,
      resteAPayer: factures.resteAPayer,
      clientNom: clients.nom,
      clientPrenom: clients.prenom,
      clientRaisonSociale: clients.raisonSociale,
    })
    .from(factures)
    .innerJoin(clients, eq(clients.id, factures.clientId))
    .where(inArray(factures.statut, ["NON_PAYEE", "PARTIELLEMENT_PAYEE"]));

  const commandesEligibles = await db
    .select({
      id: commandesFournisseur.id,
      numero: commandesFournisseur.numero,
      montantTotal: commandesFournisseur.montantTotal,
      montantRegle: commandesFournisseur.montantRegle,
      fournisseurNom: fournisseurs.nom,
    })
    .from(commandesFournisseur)
    .innerJoin(fournisseurs, eq(fournisseurs.id, commandesFournisseur.fournisseurId))
    // Un achat encore en brouillon n'engage rien : il ne doit pas apparaître
    // dans les cibles de règlement, sinon on décaisse pour une commande qui
    // peut encore changer de montant ou ne jamais être passée.
    .where(inArray(commandesFournisseur.statut, ["VALIDEE", "RECUE"]));

  const commandesAvecReste = commandesEligibles
    .map((c) => ({ ...c, resteAPayer: c.montantTotal - c.montantRegle }))
    .filter((c) => c.resteAPayer > 0);

  const [compte] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(reglements);
  const totalReglements = compte?.total ?? 0;
  const nbPages = Math.max(1, Math.ceil(totalReglements / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);

  const historique = await db.query.reglements.findMany({
    with: {
      facture: { with: { client: true } },
      commandeFournisseur: { with: { fournisseur: true } },
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: PAR_PAGE,
    offset: (pageCourante - 1) * PAR_PAGE,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Règlements</h1>
        <ReglementForm
          factures={facturesEligibles.map((f) => ({
            id: f.id,
            numero: f.numero,
            nomAffiche: nomAffiche({
              nom: f.clientNom,
              prenom: f.clientPrenom,
              raisonSociale: f.clientRaisonSociale,
            }),
            resteAPayer: f.resteAPayer ?? 0,
          }))}
          commandes={commandesAvecReste.map((c) => ({
            id: c.id,
            numero: c.numero,
            fournisseurNom: c.fournisseurNom,
            resteAPayer: c.resteAPayer,
          }))}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Sens</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Moyen</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historique.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono tabular-nums">{formatDate(r.dateReglement)}</TableCell>
                <TableCell>{libelle(SENS_REGLEMENT_LABEL, r.sens)}</TableCell>
                <TableCell>
                  {r.facture
                    ? `Facture ${r.facture.numero} — ${nomAffiche(r.facture.client)}`
                    : r.commandeFournisseur
                      ? `Achat ${r.commandeFournisseur.numero} — ${r.commandeFournisseur.fournisseur.nom}`
                      : "—"}
                </TableCell>
                <TableCell>{libelle(MOYEN_REGLEMENT_LABEL, r.moyen)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMontant(r.montant)}</TableCell>
              </TableRow>
            ))}
            {historique.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  Aucun règlement enregistré.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {nbPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pageCourante} sur {nbPages} · {totalReglements} règlement
            {totalReglements > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageCourante <= 1}
              render={<Link href={`/reglements?page=${pageCourante - 1}`} />}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pageCourante >= nbPages}
              render={<Link href={`/reglements?page=${pageCourante + 1}`} />}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
