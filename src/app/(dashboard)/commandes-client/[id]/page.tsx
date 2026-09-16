import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import {
  MODE_REGLEMENT_LABEL,
  STATUT_COMMANDE_CLIENT_LABEL,
  STATUT_PROFORMA_LABEL,
  libelle,
} from "@/lib/libelles";
import { STATUT_COMMANDE_CLIENT_BADGE } from "@/lib/statut-style";
import { Badge, Button, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { CorrectionModeReglementDialog } from "@/components/commandes/correction-mode-reglement-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { annulerCommandeClient, corrigerCommandeClient, validerCommandeClient } from "../actions";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageCommandeClient({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  const commandeId = Number(id);
  const session = await auth();
  requirePermission(session, "commandes_client:read");
  const peutEcrire = can(session, "commandes_client:write");
  const peutAnnuler = can(session, "annulation:effectuer");
  const peutFacturer = can(session, "factures:emettre");
  const peutCorriger = can(session, "commandes_client:corriger");

  const commande = await db.query.commandesClient.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: {
      client: true,
      lignes: true,
      proformas: { orderBy: (p, { desc }) => desc(p.dateProforma) },
    },
  });

  if (!commande) notFound();

  const proformaEnCours = commande.proformas.find((p) => p.statut === "EMISE");

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Group gap="xs">
            <Title order={1} size="h2" className="font-mono tabular-nums">{commande.numero}</Title>
            <Badge {...STATUT_COMMANDE_CLIENT_BADGE[commande.statut]}>
              {libelle(STATUT_COMMANDE_CLIENT_LABEL, commande.statut)}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            <Link href={`/clients/${commande.client.id}`} className="hover:underline">
              {nomAffiche(commande.client)}
            </Link>{" "}
            · <span className="font-mono tabular-nums">{formatDate(commande.dateCommande)}</span> ·{" "}
            {libelle(MODE_REGLEMENT_LABEL, commande.modeReglement)}
          </Text>
        </div>
        <Group gap="xs" wrap="wrap">
          <ApercuDocumentDialog
            href={`/commandes-client/${commande.id}/pdf`}
            titre={`Bon de commande ${commande.numero}`}
            nomFichier={`bon-commande-${commande.numero}`}
            trigger={<Button variant="outline">Voir le bon de commande</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutEcrire && commande.statut === "BROUILLON" && (
            <form action={validerCommandeClient.bind(null, commande.id)}>
              <Button type="submit">Valider</Button>
            </form>
          )}
          {peutFacturer && commande.statut === "VALIDEE" && !proformaEnCours && (
            <Button variant="outline" component={Link} href={`/proformas/nouvelle?commandeClientId=${commande.id}`}>
              Établir une proforma
            </Button>
          )}
          {peutFacturer && commande.statut === "VALIDEE" && (
            <Button component={Link} href={`/factures/nouvelle?commandeClientId=${commande.id}`}>
              Émettre la facture
            </Button>
          )}
          {peutCorriger && commande.statut !== "ANNULEE" && (
            <CorrectionModeReglementDialog
              action={corrigerCommandeClient.bind(null, commande.id)}
              modeReglementActuel={commande.modeReglement}
            />
          )}
          {peutAnnuler && commande.statut !== "ANNULEE" && commande.statut !== "FACTUREE" && (
            <AnnulationDialog
              action={annulerCommandeClient.bind(null, commande.id)}
              titre="Annuler la commande"
            />
          )}
        </Group>
      </Group>

      {commande.proformas.length > 0 && (
        <Paper withBorder radius="md" p="sm" style={{ backgroundColor: "var(--mantine-color-dark-6)" }}>
          <Text size="sm">
            <span className="font-medium">Proformas établies :</span>{" "}
            {commande.proformas.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " · "}
                <Link href={`/proformas/${p.id}`} className="font-mono tabular-nums underline">
                  {p.numero}
                </Link>{" "}
                ({libelle(STATUT_PROFORMA_LABEL, p.statut).toLowerCase()})
              </span>
            ))}
          </Text>
        </Paper>
      )}

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Désignation</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Qté</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Prix unitaire</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Montant</Table.Th>
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
        <Group justify="flex-end" p="sm" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Text size="sm" className="font-mono tabular-nums">
            Total : <strong>{formatMontant(commande.montantTotal)}</strong>
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
