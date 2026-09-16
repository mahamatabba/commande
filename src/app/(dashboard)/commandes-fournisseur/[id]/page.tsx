import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_COMMANDE_FOURNISSEUR_BADGE } from "@/lib/statut-style";
import { Badge, Button, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import {
  annulerCommandeFournisseur,
  recevoirCommandeFournisseur,
  validerCommandeFournisseur,
} from "../actions";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export default async function PageCommandeFournisseur({
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
  requirePermission(session, "commandes_fournisseur:read");
  const peutEcrire = can(session, "commandes_fournisseur:write");
  const peutAnnuler = can(session, "annulation:effectuer");
  const peutVoirDecaissements = can(session, "decaissements:read");

  const commande = await db.query.commandesFournisseur.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: { fournisseur: true, lignes: true },
  });

  if (!commande) notFound();

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Group gap="xs">
            <Title order={1} size="h2" className="font-mono tabular-nums">{commande.numero}</Title>
            <Badge {...STATUT_COMMANDE_FOURNISSEUR_BADGE[commande.statut]}>
              {STATUT_LABEL[commande.statut]}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            <Link href={`/fournisseurs/${commande.fournisseur.id}`} className="hover:underline">
              {commande.fournisseur.nom}
            </Link>{" "}
            · <span className="font-mono tabular-nums">{formatDate(commande.dateCommande)}</span>
          </Text>
        </div>
        <Group gap="xs" wrap="wrap">
          <ApercuDocumentDialog
            href={`/commandes-fournisseur/${commande.id}/pdf`}
            titre={`Bon de commande ${commande.numero}`}
            nomFichier={`bon-commande-${commande.numero}`}
            trigger={<Button variant="outline">Voir le bon de commande</Button>}
            defaultOpen={nouveau === "1"}
          />
          {peutEcrire && commande.statut === "BROUILLON" && (
            <form action={validerCommandeFournisseur.bind(null, commande.id)}>
              <Button type="submit">Valider</Button>
            </form>
          )}
          {peutEcrire && commande.statut === "VALIDEE" && (
            <form action={recevoirCommandeFournisseur.bind(null, commande.id)}>
              <Button type="submit">Marquer reçue</Button>
            </form>
          )}
          {peutAnnuler && commande.statut !== "ANNULEE" && commande.statut !== "RECUE" && (
            <AnnulationDialog
              action={annulerCommandeFournisseur.bind(null, commande.id)}
              titre="Annuler la commande"
            />
          )}
        </Group>
      </Group>

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
        <Group justify="flex-end" gap="xl" p="sm" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
          <Text size="sm" className="font-mono tabular-nums">
            Total : <strong>{formatMontant(commande.montantTotal)}</strong>
          </Text>
          {peutVoirDecaissements && (
            <Text size="sm" className="font-mono tabular-nums">
              Réglé : <strong>{formatMontant(commande.montantRegle)}</strong>
            </Text>
          )}
        </Group>
      </Paper>
    </Stack>
  );
}
