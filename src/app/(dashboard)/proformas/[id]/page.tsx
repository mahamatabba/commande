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
import { Alert, Badge, Button, Group, Paper, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title, ThemeIcon } from "@mantine/core";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { ConversionProformaDialog } from "@/components/proformas/conversion-dialog";
import { SuppressionDialog } from "@/components/shared/suppression-dialog";
import { annulerProforma, convertirProformaEnFacture, supprimerProforma } from "../actions";
import { FileSignature } from "lucide-react";
import { BandeauConfirmation } from "@/components/documents/bandeau-confirmation";
import { LienRetour } from "@/components/shared/lien-retour";
import { Copy } from "lucide-react";
import { PartagerDocument } from "@/components/documents/partager-document";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageProforma({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string; modifiee?: string }>;
}) {
  const { id } = await params;
  const { nouveau, modifiee } = await searchParams;
  const proformaId = Number(id);
  const session = await auth();
  requirePermission(session, "factures:read");
  const peutConvertir = can(session, "factures:emettre");
  const peutAnnuler = can(session, "annulation:effectuer");
  // Dupliquer une proforma = repartir d'une copie de sa vente, à chiffrer ensuite.
  const peutDupliquer = can(session, "commandes_client:write");

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
      <LienRetour href="/proformas" libelle="Proformas" />
      <Paper withBorder radius="lg" p="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <ThemeIcon size={52} radius="lg" variant="light" color="violet" visibleFrom="xs">
              <FileSignature size={26} strokeWidth={1.8} />
            </ThemeIcon>
            <div>
              <Group gap="xs">
                <Title order={1} size="h2" fw={800} className="font-mono tabular-nums">{proforma.numero}</Title>
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
          </Group>
          <Group gap="xs" wrap="wrap">
            <ApercuDocumentDialog
              href={`/proformas/${proforma.id}/pdf`}
              titre={`Proforma ${proforma.numero}`}
              nomFichier={`proforma-${proforma.numero}`}
              trigger={<Button variant="outline">Voir la proforma</Button>}
            />
            <PartagerDocument
              href={`/proformas/${proforma.id}/pdf`}
              nomFichier={`proforma-${proforma.numero}`}
              libelleDocument={`la facture proforma ${proforma.numero}`}
              telephone={proforma.client.telephone}
              email={proforma.client.email}
            />
            {peutDupliquer && (
              <Button variant="default" component={Link} href={`/commandes-client/nouvelle?depuis=${proforma.commandeClient.id}`} leftSection={<Copy size={16} />}>
                Dupliquer
              </Button>
            )}
            {peutConvertir && proforma.statut === "EMISE" && (
              <Button variant="default" component={Link} href={`/proformas/${proforma.id}/modifier`}>
                Modifier
              </Button>
            )}
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
            {peutAnnuler && proforma.statut === "ANNULEE" && (
              <SuppressionDialog
                action={supprimerProforma.bind(null, proforma.id)}
                titre={`Supprimer la proforma ${proforma.numero}`}
                libelleBouton="Supprimer la proforma"
                messageSucces="Proforma supprimée"
                description="Une proforma n'a généré aucune écriture : la supprimer ne touche ni la caisse ni la vente. La suppression reste tracée dans le journal."
              />
            )}
          </Group>
        </Group>
      </Paper>

      {(nouveau === "1" || modifiee === "1") && (
        <BandeauConfirmation
          message={modifiee === "1" ? `Proforma ${proforma.numero} modifiée.` : `Proforma ${proforma.numero} établie.`}
          href={`/proformas/${proforma.id}/pdf`}
          titre={`Proforma ${proforma.numero}`}
          nomFichier={`proforma-${proforma.numero}`}
        />
      )}

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

      <Paper withBorder radius="md" p="md">
        <Title order={2} size="h5" mb="sm">Conditions de l&apos;offre</Title>
        <Group gap="xl" wrap="wrap" align="flex-start">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Délai de livraison</Text>
            <Text size="sm">{proforma.delaiLivraison ?? "Non précisé"}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Garantie</Text>
            <Text size="sm">{proforma.garantie ?? "Non précisée"}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Validité</Text>
            <Text size="sm">Jusqu&apos;au {formatDate(proforma.dateValidite)}</Text>
          </div>
        </Group>
      </Paper>
    </Stack>
  );
}
