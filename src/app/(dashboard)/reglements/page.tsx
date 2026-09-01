import { eq, inArray, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, factures, clients, fournisseurs } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReglementForm } from "@/components/reglements/reglement-form";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageReglements() {
  const session = await auth();
  requirePermission(session, "reglements:saisir");

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
    .where(ne(commandesFournisseur.statut, "ANNULEE"));

  const commandesAvecReste = commandesEligibles
    .map((c) => ({ ...c, resteAPayer: c.montantTotal - c.montantRegle }))
    .filter((c) => c.resteAPayer > 0);

  const historique = await db.query.reglements.findMany({
    with: {
      facture: { with: { client: true } },
      commandeFournisseur: { with: { fournisseur: true } },
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 50,
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
                <TableCell>{r.sens === "ENCAISSEMENT" ? "Encaissement" : "Décaissement"}</TableCell>
                <TableCell>
                  {r.facture
                    ? `Facture ${r.facture.numero} — ${nomAffiche(r.facture.client)}`
                    : r.commandeFournisseur
                      ? `Achat ${r.commandeFournisseur.numero} — ${r.commandeFournisseur.fournisseur.nom}`
                      : "—"}
                </TableCell>
                <TableCell>{r.moyen}</TableCell>
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
    </div>
  );
}
