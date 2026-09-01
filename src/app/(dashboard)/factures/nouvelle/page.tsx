import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmettreFactureForm } from "@/components/factures/emettre-facture-form";

const MODE_LABEL: Record<string, string> = {
  ESPECES: "Espèces (comptant)",
  BON_DE_COMMANDE: "Bon de commande (à crédit)",
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageNouvelleFacture({
  searchParams,
}: {
  searchParams: Promise<{ commandeClientId?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "factures:emettre");

  const { commandeClientId } = await searchParams;
  const id = Number(commandeClientId);
  if (!id) notFound();

  const commande = await db.query.commandesClient.findFirst({
    where: (c, { eq }) => eq(c.id, id),
    with: { client: true, lignes: true },
  });
  if (!commande) notFound();

  if (commande.statut !== "VALIDEE") {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Émission de facture</h1>
        <p className="text-red-600">
          Cette commande n&apos;est pas au statut &laquo;&nbsp;Validée&nbsp;&raquo; (statut actuel :{" "}
          {commande.statut}). Elle ne peut pas être facturée.
        </p>
        <Button variant="outline" render={<Link href={`/commandes-client/${commande.id}`} />}>
          Retour à la commande
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Émission de facture</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Commande {commande.numero} · {nomAffiche(commande.client)} · {MODE_LABEL[commande.modeReglement]}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commande.lignes.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.designation}</TableCell>
                <TableCell className="text-right">{l.quantite}</TableCell>
                <TableCell className="text-right">{formatMontant(l.prixUnitaire)}</TableCell>
                <TableCell className="text-right">{formatMontant(l.montantLigne)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end border-t bg-zinc-50 p-3 text-sm">
          <span>
            Total : <strong>{formatMontant(commande.montantTotal)}</strong>
          </span>
        </div>
      </div>

      {commande.modeReglement === "ESPECES" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Vente au comptant : la facture sera immédiatement marquée &laquo;&nbsp;Soldée&nbsp;&raquo; et un
          encaissement de {formatMontant(commande.montantTotal)} sera automatiquement enregistré en caisse.
        </p>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Bon de commande : la facture sera émise avec le statut &laquo;&nbsp;Non payée&nbsp;&raquo;. Les
          règlements se saisissent ensuite depuis l&apos;écran Règlements.
        </p>
      )}

      <EmettreFactureForm commandeClientId={commande.id} />
    </div>
  );
}
