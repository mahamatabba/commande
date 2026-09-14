import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8A211C]">
              Cette commande n&apos;est pas au statut &laquo;&nbsp;Validée&nbsp;&raquo; (statut actuel :{" "}
              {commande.statut}). Elle ne peut pas être facturée.
            </p>
            <Button variant="outline" render={<Link href={`/commandes-client/${commande.id}`} />}>
              Retour à la vente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Émission de facture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vente {commande.numero} · {nomAffiche(commande.client)} · {MODE_LABEL[commande.modeReglement]}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lignes de la vente</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto border-y border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">P.U. HT</TableHead>
                      <TableHead className="text-right">Montant HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commande.lignes.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.designation}</TableCell>
                        <TableCell className="text-right">{l.quantite}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatMontant(l.prixUnitaire)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatMontant(l.montantLigne)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commande.modeReglement === "ESPECES" ? (
                <p className="rounded-[2px] border border-[#BEDACD] bg-[#E7F0EB] p-3 text-sm text-[#14563E]">
                  Vente au comptant : la facture sera immédiatement marquée &laquo;&nbsp;Soldée&nbsp;&raquo; et un
                  encaissement du montant TTC sera automatiquement enregistré en caisse.
                </p>
              ) : (
                <p className="rounded-[2px] border border-[#EBD3A8] bg-[#FBF1E0] p-3 text-sm text-[#8A5300]">
                  Bon de commande : la facture sera émise avec le statut &laquo;&nbsp;Non payée&nbsp;&raquo;. Les
                  règlements se saisissent ensuite depuis l&apos;écran Règlements.
                </p>
              )}

              {commande.client.exonereTva && (
                <p className="rounded-[2px] border border-[#C6D2E0] bg-[#EEF2F7] p-3 text-sm text-[#1E3A5F]">
                  Ce client est enregistré comme exonéré de TVA. Le choix reste
                  modifiable ci-dessous pour cette facture.
                </p>
              )}

              <EmettreFactureForm
                commandeClientId={commande.id}
                montantHt={commande.montantTotal}
                exonerePartDefaut={commande.client.exonereTva}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
