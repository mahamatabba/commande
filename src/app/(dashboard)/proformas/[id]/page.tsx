import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import { STATUT_PROFORMA_BADGE } from "@/lib/statut-style";
// Sous-composants importés à plat (`TableThead`) et non en notation pointée
// (`Table.Thead`) : dans un composant serveur, `Table` n'est qu'une référence
// vers @mantine/core, et `.Thead` y désigne un export qui n'existe pas. Le
// composant vaut alors `undefined` au rendu et la page casse.
import { Alert, Badge, Button, Group, Paper, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { ConversionProformaDialog } from "@/components/proformas/conversion-dialog";
import { annulerProforma, convertirProformaEnFacture } from "../actions";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageProforma({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  const proformaId = Number(id);
  const session = await auth();
  requirePermission(session, "factures:read");
  const peutConvertir = can(session, "factures:emettre");
  const peutAnnuler = can(session, "annulation:effectuer");

  const proforma = await db.query.proformas.findFirst({
    where: (p, { eq }) => eq(p.id, proformaId),
    with: {
      client: true,
      commandeClient: { with: { lignes: true } },
      facture: true,
    },
  });

  if (!proforma) notFound();

  const expiree = proforma.statut === "EMISE" && proforma.dateValidite < new Date();

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Group gap="xs">
            <Title order={1} size="h2" className="font-mono tabular-nums">{proforma.numero}</Title>
            <Badge {...STATUT_PROFORMA_BADGE[proforma.statut]}>
              {libelle(STATUT_PROFORMA_LABEL, proforma.statut)}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            <Link href={`/clients/${proforma.client.id}`} className="hover:underline">
              {nomAffiche(proforma.client)}
            </Link>{" "}
            · <span className="font-mono tabular-nums">{formatDate(proforma.dateProforma)}</span> · vente{" "}
            <Link href={`/commandes-client/${proforma.commandeClient.id}`} className="font-mono tabular-nums hover:underline">
              {proforma.commandeClient.numero}
            </Link>
          </Text>
        </div>
        <Group gap="xs" wrap="wrap">
          <ApercuDocumentDialog
            href={`/proformas/${proforma.id}/pdf`}
            titre={`Proforma ${proforma.numero}`}
            nomFichier={`proforma-${proforma.numero}`}
            trigger={<Button variant="outline">Voir la proforma</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutConvertir && proforma.statut === "EMISE" && (
            <ConversionProformaDialog
              action={convertirProformaEnFacture.bind(null, proforma.id)}
              montantTotal={proforma.montantTotal}
              auComptant={proforma.commandeClient.modeReglement === "ESPECES"}
            />
          )}
          {peutAnnuler && proforma.statut === "EMISE" && (
            <AnnulationDialog
              action={annulerProforma.bind(null, proforma.id)}
              titre="Annuler la proforma"
              description="Aucune écriture comptable n'est reprise : une proforma n'en a généré aucune. L'annulation libère la vente pour un nouveau chiffrage."
            />
          )}
        </Group>
      </Group>

      {proforma.statut === "CONVERTIE" && proforma.facture && (
        <Alert color="green" variant="light">
          Convertie en facture{" "}
          <Link href={`/factures/${proforma.facture.id}`} className="font-mono tabular-nums underline">
            {proforma.facture.numero}
          </Link>{" "}
          le {formatDate(proforma.facture.dateFacture)}.
        </Alert>
      )}

      {expiree && (
        <Alert color="yellow" variant="light">
          Cette offre a expiré le {formatDate(proforma.dateValidite)}. Le prix annoncé n&apos;engage
          plus AEI : vérifiez-le avant de convertir, ou annulez cette proforma et établissez-en une
          nouvelle.
        </Alert>
      )}

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
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
            {proforma.commandeClient.lignes.map((l) => (
              <TableTr key={l.id}>
                <TableTd>{l.designation}</TableTd>
                <TableTd className="font-mono tabular-nums" style={{ textAlign: "right" }}>{l.quantite}</TableTd>
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
        <Group gap="xl" p="sm" justify="flex-end" wrap="wrap" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Text size="sm" className="font-mono tabular-nums">
            Total HT : <strong>{formatMontant(proforma.montantHt)}</strong>
          </Text>
          <Text size="sm" className="font-mono tabular-nums">
            {proforma.exonereTva ? "TVA exonérée" : `TVA ${formatTaux(proforma.tauxTva)}`} :{" "}
            <strong>{formatMontant(proforma.montantTva)}</strong>
          </Text>
          <Text size="sm" className="font-mono tabular-nums">
            Total TTC : <strong>{formatMontant(proforma.montantTotal)}</strong>
          </Text>
          <Text size="sm" className="font-mono tabular-nums">
            Valable jusqu&apos;au : <strong>{formatDate(proforma.dateValidite)}</strong>
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
