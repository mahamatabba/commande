import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, commandesClient } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import {
  STATUTS_COMMANDE_CLIENT,
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { STATUT_COMMANDE_CLIENT_LABEL, libelle } from "@/lib/libelles";
import { Button, Group, Paper, Select, Stack, TextInput, Title } from "@mantine/core";
import { CommandesClientTable } from "./commandes-client-table";

/** Nombre de ventes affichées par page. */
const PAR_PAGE = 50;

export default async function PageCommandesClient({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "commandes_client:read");
  const peutEcrire = can(session, "commandes_client:write");
  const params = await searchParams;
  const { statut, du, au } = params;
  const pageDemandee = lirePage(params.page);

  const statutFiltre = lireStatut(statut, STATUTS_COMMANDE_CLIENT);
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    statutFiltre ? eq(commandesClient.statut, statutFiltre) : undefined,
    debut ? gte(commandesClient.dateCommande, debut) : undefined,
    fin ? lte(commandesClient.dateCommande, fin) : undefined,
  ].filter(Boolean);
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  const [comptes, commandes] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(commandesClient)
      .innerJoin(clients, eq(commandesClient.clientId, clients.id))
      .where(filtre),
    db
      .select({
        id: commandesClient.id,
        numero: commandesClient.numero,
        dateCommande: commandesClient.dateCommande,
        statut: commandesClient.statut,
        modeReglement: commandesClient.modeReglement,
        montantTotal: commandesClient.montantTotal,
        clientNom: clients.nom,
        clientPrenom: clients.prenom,
        clientRaisonSociale: clients.raisonSociale,
      })
      .from(commandesClient)
      .innerJoin(clients, eq(commandesClient.clientId, clients.id))
      .where(filtre)
      // L'`id` départage deux ventes du même jour : sans lui, l'ordre peut
      // varier d'une page à l'autre et une ligne se répéter.
      .orderBy(desc(commandesClient.dateCommande), desc(commandesClient.id))
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/commandes-client", params, pageCourante));
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Ventes</Title>
        {peutEcrire && (
          <Button component={Link} href="/commandes-client/nouvelle">
            Nouvelle vente
          </Button>
        )}
      </Group>

      <form>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <Select
            label="Statut"
            name="statut"
            defaultValue={statutFiltre}
            placeholder="Tous"
            clearable
            w={160}
            data={STATUTS_COMMANDE_CLIENT.map((s) => ({
              value: s,
              label: libelle(STATUT_COMMANDE_CLIENT_LABEL, s),
            }))}
          />
          <TextInput label="Du" name="du" type="date" defaultValue={du} />
          <TextInput label="Au" name="au" type="date" defaultValue={au} />
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          {(statut || du || au) && (
            <Button variant="subtle" component={Link} href="/commandes-client">
              Réinitialiser
            </Button>
          )}
        </Group>
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <CommandesClientTable commandes={commandes} />
      </Paper>

      <PaginationListe
        base="/commandes-client"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="vente"
      />
    </Stack>
  );
}
