import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { MODE_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmettreProformaForm } from "@/components/proformas/emettre-proforma-form";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageNouvelleProforma({
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
    with: { client: true, lignes: true, proformas: true },
  });
  if (!commande) notFound();

  const proformaEnCours = commande.proformas.find((p) => p.statut === "EMISE");

  if (commande.statut !== "VALIDEE" || proformaEnCours) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Établir une proforma</h1>
        <Card>
          <CardContent className="space-y-4">
            {proformaEnCours ? (
              <p className="text-sm text-[#8A5300]">
                La proforma{" "}
                <Link
                  href={`/proformas/${proformaEnCours.id}`}
                  className="font-mono tabular-nums underline"
                >
                  {proformaEnCours.numero}
                </Link>{" "}
                est déjà en circulation pour cette vente. Annulez-la avant d&apos;en établir une
                nouvelle.
              </p>
            ) : (
              <p className="text-sm text-[#8A211C]">
                Cette vente n&apos;est pas au statut «&nbsp;Validée&nbsp;». Une proforma ne peut être
                établie que sur une vente validée, dont les montants ne changent plus.
              </p>
            )}
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
        <h1 className="text-2xl font-semibold">Établir une proforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vente {commande.numero} · {nomAffiche(commande.client)} ·{" "}
          {libelle(MODE_REGLEMENT_LABEL, commande.modeReglement)}
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
                        <TableCell className="text-right font-mono tabular-nums">{l.quantite}</TableCell>
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
              <CardTitle>Chiffrage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-[2px] border border-[#C6D2E0] bg-[#EEF2F7] p-3 text-sm text-[#1E3A5F]">
                La proforma n&apos;est pas une facture : aucune créance n&apos;est ouverte, rien
                n&apos;entre en caisse et la vente reste au statut «&nbsp;Validée&nbsp;». Elle se
                convertit en facture définitive en un clic le moment venu.
              </p>

              {commande.client.exonereTva && (
                <p className="rounded-[2px] border border-[#C6D2E0] bg-[#EEF2F7] p-3 text-sm text-[#1E3A5F]">
                  Ce client est enregistré comme exonéré de TVA. Le choix reste modifiable
                  ci-dessous pour cette proforma.
                </p>
              )}

              <EmettreProformaForm
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
