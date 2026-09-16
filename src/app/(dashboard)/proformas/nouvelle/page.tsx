import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { MODE_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import { Alert, Button, Card, Grid, Stack, Table, Text, Title } from "@mantine/core";
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
      <Stack gap="md" maw={640}>
        <Title order={1} size="h2">Établir une proforma</Title>
        <Card withBorder radius="md">
          <Stack gap="md">
            {proformaEnCours ? (
              <Text size="sm" c="yellow">
                La proforma{" "}
                <Link href={`/proformas/${proformaEnCours.id}`} className="font-mono tabular-nums underline">
                  {proformaEnCours.numero}
                </Link>{" "}
                est déjà en circulation pour cette vente. Annulez-la avant d&apos;en établir une
                nouvelle.
              </Text>
            ) : (
              <Text size="sm" c="red">
                Cette vente n&apos;est pas au statut «&nbsp;Validée&nbsp;». Une proforma ne peut être
                établie que sur une vente validée, dont les montants ne changent plus.
              </Text>
            )}
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
        <Title order={1} size="h2">Établir une proforma</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Vente {commande.numero} · {nomAffiche(commande.client)} ·{" "}
          {libelle(MODE_REGLEMENT_LABEL, commande.modeReglement)}
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
                    <Table.Td className="font-mono tabular-nums" style={{ textAlign: "right" }}>{l.quantite}</Table.Td>
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
              <Title order={2} size="h5">Chiffrage</Title>

              <Alert color="blue" variant="light">
                La proforma n&apos;est pas une facture : aucune créance n&apos;est ouverte, rien
                n&apos;entre en caisse et la vente reste au statut «&nbsp;Validée&nbsp;». Elle se
                convertit en facture définitive en un clic le moment venu.
              </Alert>

              {commande.client.exonereTva && (
                <Alert color="blue" variant="light">
                  Ce client est enregistré comme exonéré de TVA. Le choix reste modifiable
                  ci-dessous pour cette proforma.
                </Alert>
              )}

              <EmettreProformaForm
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
