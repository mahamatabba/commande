import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { Alert, Button, Card, Grid, Stack, Table, Text, Title } from "@mantine/core";
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
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card withBorder radius="md" p={0}>
            <Title order={2} size="h5" p="md" pb="sm">Lignes de la vente</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Désignation</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Qté</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>P.U. HT</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Montant HT</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {commande.lignes.map((l) => (
                  <Table.Tr key={l.id}>
                    <Table.Td>{l.designation}</Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>{l.quantite}</Table.Td>
                    <Table.Td className="font-mono tabular-nums" style={{ textAlign: "right" }}>
                      {formatMontant(l.prixUnitaire)}
                    </Table.Td>
                    <Table.Td className="font-mono tabular-nums" style={{ textAlign: "right" }}>
                      {formatMontant(l.montantLigne)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }} style={{ position: "sticky", top: "1.5rem" }}>
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
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
