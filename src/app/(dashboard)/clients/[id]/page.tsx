import { notFound } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, commandesClient, factures, proformas } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatMontant } from "@/lib/format";
import { Alert, Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { modifierClient } from "../actions";
import { ClientDetailTables } from "./client-detail-tables";

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

      <ClientDetailTables
        commandes={commandes}
        proformasClient={proformasClient}
        facturesClient={facturesClient}
        peutVoirProformas={peutVoirProformas}
        peutVoirSolde={peutVoirSolde}
      />
    </Stack>
  );
}
