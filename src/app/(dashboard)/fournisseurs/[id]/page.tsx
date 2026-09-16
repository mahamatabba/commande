import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, fournisseurs } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_COMMANDE_FOURNISSEUR_BADGE } from "@/lib/statut-style";
import { Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { modifierFournisseur } from "../actions";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export default async function PageFournisseur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fournisseurId = Number(id);
  const session = await auth();
  requirePermission(session, "referentiels:read");
  const peutEcrire = can(session, "referentiels:write");
  const peutVoirDecaissements = can(session, "decaissements:read");

  // La fiche et ses achats ne dépendent pas l'un de l'autre : on les lit
  // ensemble plutôt qu'à la suite. Les règlements, eux, ont besoin des
  // identifiants de commande — cette lecture-là reste séquentielle.
  const [fournisseur, commandes] = await Promise.all([
    db
      .select()
      .from(fournisseurs)
      .where(eq(fournisseurs.id, fournisseurId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select()
      .from(commandesFournisseur)
      .where(eq(commandesFournisseur.fournisseurId, fournisseurId))
      .orderBy(desc(commandesFournisseur.dateCommande)),
  ]);

  if (!fournisseur) notFound();

  // Règlements liés aux commandes de ce fournisseur (jointure applicative,
  // le nombre de commandes par fournisseur reste faible).
  const idsCommandes = commandes.map((c) => c.id);
  const paiementsFournisseur =
    peutVoirDecaissements && idsCommandes.length > 0
      ? await db.query.reglements.findMany({
          where: (r, { inArray }) => inArray(r.commandeFournisseurId, idsCommandes),
          orderBy: (r, { desc }) => desc(r.dateReglement),
        })
      : [];

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Title order={1} size="h2">{fournisseur.nom}</Title>
          <Group gap="xs" mt={4} wrap="wrap">
            <Text size="sm" c="dimmed" className="font-mono tabular-nums">{fournisseur.telephone}</Text>
            {fournisseur.email && <Text size="sm" c="dimmed">· {fournisseur.email}</Text>}
            {fournisseur.nif && (
              <Badge color="gray" variant="light" className="font-mono tabular-nums">
                NIF {fournisseur.nif}
              </Badge>
            )}
            <Badge color={fournisseur.actif ? "green" : "gray"} variant="light">
              {fournisseur.actif ? "Actif" : "Inactif"}
            </Badge>
          </Group>
          {fournisseur.adresse && (
            <Text size="sm" c="dimmed" mt={4}>{fournisseur.adresse}</Text>
          )}
        </div>
        {peutEcrire && (
          <FournisseurFormDialog
            action={modifierFournisseur.bind(null, fournisseur.id)}
            fournisseur={fournisseur}
            trigger={<Button variant="outline">Modifier</Button>}
          />
        )}
      </Group>

      <div>
        <Title order={2} size="h4" mb="sm">Achats</Title>
        <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
          <DataTable
            records={commandes}
            idAccessor="id"
            withTableBorder={false}
            noRecordsText="Aucune commande."
            columns={[
              {
                accessor: "numero",
                title: "Numéro",
                render: (c) => (
                  <Link href={`/commandes-fournisseur/${c.id}`} className="font-mono font-medium tabular-nums hover:underline">
                    {c.numero}
                  </Link>
                ),
              },
              {
                accessor: "dateCommande",
                title: "Date",
                render: (c) => <span className="font-mono tabular-nums">{formatDate(c.dateCommande)}</span>,
              },
              {
                accessor: "statut",
                title: "Statut",
                render: (c) => (
                  <Badge {...STATUT_COMMANDE_FOURNISSEUR_BADGE[c.statut]}>{STATUT_LABEL[c.statut]}</Badge>
                ),
              },
              {
                accessor: "montantTotal",
                title: "Montant",
                textAlign: "right",
                render: (c) => <span className="font-mono tabular-nums">{formatMontant(c.montantTotal)}</span>,
              },
              ...(peutVoirDecaissements
                ? [
                    {
                      accessor: "montantRegle",
                      title: "Réglé",
                      textAlign: "right" as const,
                      render: (c: (typeof commandes)[number]) => (
                        <span className="font-mono tabular-nums">{formatMontant(c.montantRegle)}</span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Paper>
      </div>

      {peutVoirDecaissements && (
        <div>
          <Title order={2} size="h4" mb="sm">Paiements (décaissements)</Title>
          <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
            <DataTable
              records={paiementsFournisseur}
              idAccessor="id"
              withTableBorder={false}
              noRecordsText="Aucun paiement."
              columns={[
                {
                  accessor: "dateReglement",
                  title: "Date",
                  render: (p) => <span className="font-mono tabular-nums">{formatDate(p.dateReglement)}</span>,
                },
                { accessor: "moyen", title: "Moyen" },
                {
                  accessor: "montant",
                  title: "Montant",
                  textAlign: "right",
                  render: (p) => <span className="font-mono tabular-nums">{formatMontant(p.montant)}</span>,
                },
              ]}
            />
          </Paper>
        </div>
      )}
    </Stack>
  );
}
