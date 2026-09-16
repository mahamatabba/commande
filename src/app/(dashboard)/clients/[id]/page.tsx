import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, commandesClient, factures, proformas } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import {
  STATUT_COMMANDE_CLIENT_BADGE,
  STATUT_FACTURE_BADGE,
  STATUT_PROFORMA_BADGE,
} from "@/lib/statut-style";
import { Alert, Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { modifierClient } from "../actions";

const STATUT_COMMANDE_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

const STATUT_FACTURE_LABEL: Record<string, string> = {
  NON_PAYEE: "Non payée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  SOLDEE: "Soldée",
  ANNULEE: "Annulée",
};

export default async function PageClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = Number(id);
  const session = await auth();
  requirePermission(session, "referentiels:read");
  const peutEcrire = can(session, "referentiels:write");
  const peutVoirSolde = can(session, "impayes:read");
  const peutVoirProformas = can(session, "factures:read");

  // Les cinq lectures sont indépendantes : enchaînées, elles coûtaient cinq
  // allers-retours successifs jusqu'à la base. Lancées ensemble, elles n'en
  // coûtent plus qu'un seul — la fiche s'ouvre en une fraction du temps.
  const [client, commandes, facturesClient, proformasClient, soldeRows] = await Promise.all([
    db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select()
      .from(commandesClient)
      .where(eq(commandesClient.clientId, clientId))
      .orderBy(desc(commandesClient.dateCommande)),
    db
      .select()
      .from(factures)
      .where(eq(factures.clientId, clientId))
      .orderBy(desc(factures.dateFacture)),
    // Les chiffrages remis à ce client : sans cette liste, retrouver l'offre
    // qu'on lui a laissée il y a trois semaines obligeait à passer par la
    // vente correspondante, encore fallait-il se souvenir de son numéro.
    peutVoirProformas
      ? db
          .select()
          .from(proformas)
          .where(eq(proformas.clientId, clientId))
          .orderBy(desc(proformas.dateProforma))
      : Promise.resolve([] as (typeof proformas.$inferSelect)[]),
    peutVoirSolde
      ? db
          .select({ total: sql<number>`coalesce(sum(${factures.resteAPayer}), 0)` })
          .from(factures)
          .where(and(eq(factures.clientId, clientId), ne(factures.statut, "ANNULEE")))
      : Promise.resolve([{ total: 0 }]),
  ]);

  if (!client) notFound();

  const soldeDu = peutVoirSolde ? Number(soldeRows[0]?.total ?? 0) : 0;

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Title order={1} size="h2">
            {client.raisonSociale || `${client.nom} ${client.prenom ?? ""}`.trim()}
          </Title>
          <Group gap="xs" mt={4} wrap="wrap">
            <Text size="sm" c="dimmed" className="font-mono tabular-nums">{client.telephone}</Text>
            {client.email && <Text size="sm" c="dimmed">· {client.email}</Text>}
            {client.nif && (
              <Badge color="gray" variant="light" className="font-mono tabular-nums">
                NIF {client.nif}
              </Badge>
            )}
            <Badge color={client.actif ? "green" : "gray"} variant="light">
              {client.actif ? "Actif" : "Inactif"}
            </Badge>
          </Group>
          {client.adresse && (
            <Text size="sm" c="dimmed" mt={4}>{client.adresse}</Text>
          )}
          {peutVoirSolde && (
            soldeDu > 0 ? (
              <Alert color="red" variant="light" mt="sm" p="xs" className="inline-block">
                <Group gap="xs">
                  <span>Solde dû :</span>
                  <span className="font-mono text-base font-semibold tabular-nums">{formatMontant(soldeDu)}</span>
                </Group>
              </Alert>
            ) : (
              <Text size="sm" c="dimmed" mt="xs">
                Solde dû :{" "}
                <span className="font-mono font-semibold tabular-nums text-[var(--mantine-color-text)]">
                  {formatMontant(soldeDu)}
                </span>
              </Text>
            )
          )}
        </div>
        {peutEcrire && (
          <ClientFormDialog
            action={modifierClient.bind(null, client.id)}
            client={client}
            trigger={<Button variant="outline">Modifier</Button>}
          />
        )}
      </Group>

      <div>
        <Title order={2} size="h4" mb="sm">Ventes</Title>
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
                  <Link href={`/commandes-client/${c.id}`} className="font-mono font-medium tabular-nums hover:underline">
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
                accessor: "modeReglement",
                title: "Mode de règlement",
                render: (c) => (c.modeReglement === "ESPECES" ? "Espèces" : "Bon de commande"),
              },
              {
                accessor: "statut",
                title: "Statut",
                render: (c) => (
                  <Badge {...STATUT_COMMANDE_CLIENT_BADGE[c.statut]}>{STATUT_COMMANDE_LABEL[c.statut]}</Badge>
                ),
              },
              {
                accessor: "montantTotal",
                title: "Montant",
                textAlign: "right",
                render: (c) => <span className="font-mono tabular-nums">{formatMontant(c.montantTotal)}</span>,
              },
            ]}
          />
        </Paper>
      </div>

      {/* Section affichée seulement si le client a reçu au moins un chiffrage :
          la proforma est une étape facultative, un tableau vide sur chaque
          fiche n'apprendrait rien. */}
      {peutVoirProformas && proformasClient.length > 0 && (
        <div>
          <Title order={2} size="h4" mb="sm">Proformas</Title>
          <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
            <DataTable
              records={proformasClient}
              idAccessor="id"
              withTableBorder={false}
              columns={[
                {
                  accessor: "numero",
                  title: "Numéro",
                  render: (p) => (
                    <Link href={`/proformas/${p.id}`} className="font-mono font-medium tabular-nums hover:underline">
                      {p.numero}
                    </Link>
                  ),
                },
                {
                  accessor: "dateProforma",
                  title: "Date",
                  render: (p) => <span className="font-mono tabular-nums">{formatDate(p.dateProforma)}</span>,
                },
                {
                  accessor: "dateValidite",
                  title: "Valable jusqu'au",
                  render: (p) => {
                    const expiree = p.statut === "EMISE" && p.dateValidite < new Date();
                    return (
                      <span
                        className={`font-mono tabular-nums${expiree ? " text-[var(--mantine-color-yellow-6)]" : ""}`}
                        title={expiree ? "Offre expirée : le prix annoncé n'engage plus AEI." : undefined}
                      >
                        {formatDate(p.dateValidite)}
                      </span>
                    );
                  },
                },
                {
                  accessor: "statut",
                  title: "Statut",
                  render: (p) => (
                    <Badge {...STATUT_PROFORMA_BADGE[p.statut]}>{libelle(STATUT_PROFORMA_LABEL, p.statut)}</Badge>
                  ),
                },
                {
                  accessor: "montantTotal",
                  title: "Montant",
                  textAlign: "right",
                  render: (p) => <span className="font-mono tabular-nums">{formatMontant(p.montantTotal)}</span>,
                },
              ]}
            />
          </Paper>
        </div>
      )}

      <div>
        <Title order={2} size="h4" mb="sm">Factures</Title>
        <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
          <DataTable
            records={facturesClient}
            idAccessor="id"
            withTableBorder={false}
            noRecordsText="Aucune facture."
            columns={[
              {
                accessor: "numero",
                title: "Numéro",
                render: (f) => (
                  <Link href={`/factures/${f.id}`} className="font-mono font-medium tabular-nums hover:underline">
                    {f.numero}
                  </Link>
                ),
              },
              {
                accessor: "dateFacture",
                title: "Date",
                render: (f) => <span className="font-mono tabular-nums">{formatDate(f.dateFacture)}</span>,
              },
              ...(peutVoirSolde
                ? [
                    {
                      accessor: "statut",
                      title: "Statut",
                      render: (f: (typeof facturesClient)[number]) => (
                        <Badge {...STATUT_FACTURE_BADGE[f.statut]}>{STATUT_FACTURE_LABEL[f.statut]}</Badge>
                      ),
                    },
                  ]
                : []),
              {
                accessor: "montantTotal",
                title: "Montant",
                textAlign: "right",
                render: (f) => <span className="font-mono tabular-nums">{formatMontant(f.montantTotal)}</span>,
              },
              ...(peutVoirSolde
                ? [
                    {
                      accessor: "resteAPayer",
                      title: "Reste à payer",
                      textAlign: "right" as const,
                      render: (f: (typeof facturesClient)[number]) => (
                        <span className="font-mono tabular-nums">{formatMontant(f.resteAPayer ?? 0)}</span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Paper>
      </div>
    </Stack>
  );
}
