import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
// Sous-composants importés à plat (`TableThead`) et non en notation pointée
// (`Table.Thead`) : dans un composant serveur, `Table` n'est qu'une référence
// vers @mantine/core, et `.Thead` y désigne un export qui n'existe pas. Le
// composant vaut alors `undefined` au rendu et la page casse.
import { Alert, Button, Card, Grid, GridCol, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import Link from "next/link";
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
      <Stack gap="md" maw={640}>
        <Title order={1} size="h2">Émission de facture</Title>
        <Card withBorder radius="md">
          <Stack gap="md">
            <Text size="sm" c="red">
              Cette commande n&apos;est pas au statut &laquo;&nbsp;Validée&nbsp;&raquo; (statut actuel :{" "}
              {commande.statut}). Elle ne peut pas être facturée.
            </Text>
            <Button variant="outline" component={Link} href={`/commandes-client/${commande.id}`}>
              Retour à la vente
            </Button>
          </Stack>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="xl" maw={1152}>
      <div>
        <Title order={1} size="h2">Émission de facture</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Vente {commande.numero} · {nomAffiche(commande.client)} · {MODE_LABEL[commande.modeReglement]}
        </Text>
      </div>

      <Grid align="flex-start">
        <GridCol span={{ base: 12, lg: 8 }}>
          <Card withBorder radius="md" p={0}>
            <Title order={2} size="h5" p="md" pb="sm">Lignes de la vente</Title>
            <Table>
              <TableThead>
                <TableTr>
                  <TableTh>Désignation</TableTh>
                  <TableTh style={{ textAlign: "right" }}>Qté</TableTh>
                  <TableTh style={{ textAlign: "right" }}>P.U. HT</TableTh>
                  <TableTh style={{ textAlign: "right" }}>Montant HT</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {commande.lignes.map((l) => (
                  <TableTr key={l.id}>
                    <TableTd>{l.designation}</TableTd>
                    <TableTd style={{ textAlign: "right" }}>{l.quantite}</TableTd>
                    <TableTd className="font-mono tabular-nums" style={{ textAlign: "right" }}>
                      {formatMontant(l.prixUnitaire)}
                    </TableTd>
                    <TableTd className="font-mono tabular-nums" style={{ textAlign: "right" }}>
                      {formatMontant(l.montantLigne)}
                    </TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </Card>
        </GridCol>

        <GridCol span={{ base: 12, lg: 4 }} style={{ position: "sticky", top: "1.5rem" }}>
          <Card withBorder radius="md">
            <Stack gap="md">
              <Title order={2} size="h5">Récapitulatif</Title>

              {commande.modeReglement === "ESPECES" ? (
                <Alert color="green" variant="light">
                  Vente au comptant : la facture sera immédiatement marquée &laquo;&nbsp;Soldée&nbsp;&raquo; et un
                  encaissement du montant TTC sera automatiquement enregistré en caisse.
                </Alert>
              ) : (
                <Alert color="yellow" variant="light">
                  Bon de commande : la facture sera émise avec le statut &laquo;&nbsp;Non payée&nbsp;&raquo;. Les
                  règlements se saisissent ensuite depuis l&apos;écran Règlements.
                </Alert>
              )}

              {commande.client.exonereTva && (
                <Alert color="blue" variant="light">
                  Ce client est enregistré comme exonéré de TVA. Le choix reste
                  modifiable ci-dessous pour cette facture.
                </Alert>
              )}

              <EmettreFactureForm
                commandeClientId={commande.id}
                montantHt={commande.montantTotal}
                exonerePartDefaut={commande.client.exonereTva}
              />
            </Stack>
          </Card>
        </GridCol>
      </Grid>
    </Stack>
  );
}
