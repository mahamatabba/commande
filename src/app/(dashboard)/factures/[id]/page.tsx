import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { STATUT_FACTURE_BADGE } from "@/lib/statut-style";
// Sous-composants importés à plat (`TableThead`) et non en notation pointée
// (`Table.Thead`) : dans un composant serveur, `Table` n'est qu'une référence
// vers @mantine/core, et `.Thead` y désigne un export qui n'existe pas. Le
// composant vaut alors `undefined` au rendu et la page casse.
import { Badge, Button, Group, Paper, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { MarquerPayeeDialog } from "@/components/factures/marquer-payee-dialog";
import { annulerFacture, marquerFacturePayee } from "../actions";
import { ReglementsFactureTable } from "./reglements-table";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageFacture({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  const factureId = Number(id);
  const session = await auth();
  requirePermission(session, "factures:read");
  const peutVoirImpayes = can(session, "impayes:read");
  const peutVoirEncaissements = can(session, "encaissements:read");
  const peutAnnuler = can(session, "annulation:effectuer");
  const peutRegler = can(session, "reglements:saisir");

  const facture = await db.query.factures.findFirst({
    where: (f, { eq }) => eq(f.id, factureId),
    with: {
      client: true,
      commandeClient: { with: { lignes: true } },
      reglements: true,
      // Chiffrage dont cette facture est issue, quand elle vient d'une
      // conversion : sans ce lien, retrouver l'offre acceptée par le client
      // obligerait à fouiller le journal d'activité.
      proformaOrigine: true,
    },
  });

  if (!facture) notFound();

  // `resteAPayer` est une colonne calculée par la base ; la soustraction n'est
  // qu'un filet de sécurité pour le cas où elle ne serait pas remontée.
  const resteAPayer = facture.resteAPayer ?? facture.montantTotal - facture.montantRegle;
  const encaissable = facture.statut !== "ANNULEE" && resteAPayer > 0;

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Group gap="xs">
            <Title order={1} size="h2" className="font-mono tabular-nums">{facture.numero}</Title>
            {peutVoirImpayes && (
              <Badge {...STATUT_FACTURE_BADGE[facture.statut]}>
                {libelle(STATUT_FACTURE_LABEL, facture.statut)}
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            <Link href={`/clients/${facture.client.id}`} className="hover:underline">
              {nomAffiche(facture.client)}
            </Link>{" "}
            · <span className="font-mono tabular-nums">{formatDate(facture.dateFacture)}</span>
          </Text>
        </div>
        <Group gap="xs" wrap="wrap">
          <ApercuDocumentDialog
            href={`/factures/${facture.id}/pdf`}
            titre={`Facture ${facture.numero}`}
            nomFichier={`facture-${facture.numero}`}
            trigger={<Button variant="outline">Voir la facture</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutRegler && encaissable && (
            <MarquerPayeeDialog
              action={marquerFacturePayee.bind(null, facture.id)}
              resteAPayer={resteAPayer}
            />
          )}
          {peutAnnuler && facture.statut !== "ANNULEE" && (
            <AnnulationDialog
              action={annulerFacture.bind(null, facture.id)}
              titre="Annuler la facture"
              description="L'annulation est définitive et tracée. Si la facture est déjà réglée, un mouvement de caisse inverse sera généré automatiquement."
            />
          )}
        </Group>
      </Group>

      {facture.proformaOrigine && (
        <Paper withBorder radius="md" p="sm" style={{ backgroundColor: "var(--mantine-color-dark-6)" }}>
          <Text size="sm">
            Établie à partir de la proforma{" "}
            <Link href={`/proformas/${facture.proformaOrigine.id}`} className="font-mono tabular-nums underline">
              {facture.proformaOrigine.numero}
            </Link>{" "}
            du {formatDate(facture.proformaOrigine.dateProforma)}.
          </Text>
        </Paper>
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
            {facture.commandeClient.lignes.map((l) => (
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
            Total HT : <strong>{formatMontant(facture.montantHt)}</strong>
          </Text>
          <Text size="sm" className="font-mono tabular-nums">
            {facture.exonereTva ? "TVA exonérée" : `TVA ${formatTaux(facture.tauxTva)}`} :{" "}
            <strong>{formatMontant(facture.montantTva)}</strong>
          </Text>
          <Text size="sm" className="font-mono tabular-nums">
            Total TTC : <strong>{formatMontant(facture.montantTotal)}</strong>
          </Text>
          {peutVoirImpayes && (
            <>
              <Text size="sm" className="font-mono tabular-nums">
                Réglé : <strong>{formatMontant(facture.montantRegle)}</strong>
              </Text>
              <Text size="sm" className="font-mono tabular-nums">
                Reste à payer :{" "}
                <strong className={resteAPayer > 0 ? "text-[var(--mantine-color-red-5)]" : undefined}>
                  {formatMontant(resteAPayer)}
                </strong>
              </Text>
            </>
          )}
        </Group>
      </Paper>

      {peutVoirEncaissements && (
        <div>
          <Title order={2} size="h4" mb="sm">Règlements</Title>
          <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
            <ReglementsFactureTable reglements={facture.reglements} />
          </Paper>
        </div>
      )}
    </Stack>
  );
}
