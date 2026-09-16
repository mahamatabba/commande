import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { ClientsTable } from "./clients-table";
import { creerClient, modifierClient, basculerActifClient } from "./actions";

/** Nombre de clients affichés par page. */
const PAR_PAGE = 50;

export default async function PageClients({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "referentiels:read");
  const params = await searchParams;
  const { q } = params;
  const pageDemandee = lirePage(params.page);
  const peutEcrire = can(session, "referentiels:write");

  const filtre = q
    ? or(
        ilike(clients.nom, `%${q}%`),
        ilike(clients.raisonSociale, `%${q}%`),
        ilike(clients.telephone, `%${q}%`),
      )
    : undefined;

  const [comptes, liste] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(clients).where(filtre),
    db
      .select()
      .from(clients)
      .where(filtre)
      // Le nom seul ne suffit pas à ordonner : deux homonymes peuvent changer
      // de place entre deux pages, l'un apparaissant deux fois et l'autre pas
      // du tout. L'`id` fige l'ordre.
      .orderBy(clients.nom, clients.id)
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/clients", params, pageCourante));
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Clients</Title>
        {peutEcrire && <ClientFormDialog action={creerClient} />}
      </Group>

      <form className="max-w-sm">
        <TextInput name="q" placeholder="Rechercher un client..." defaultValue={q} />
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <ClientsTable
          liste={liste}
          peutEcrire={peutEcrire}
          modifierClient={modifierClient}
          basculerActifClient={basculerActifClient}
        />
      </Paper>

      <PaginationListe
        base="/clients"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="client"
      />
    </Stack>
  );
}
