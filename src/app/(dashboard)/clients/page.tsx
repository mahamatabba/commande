import Link from "next/link";
import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Badge, Button, Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { creerClient, modifierClient, basculerActifClient } from "./actions";

/** Nombre de clients affichés par page. */
const PAR_PAGE = 50;

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

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
        <DataTable
          records={liste}
          idAccessor="id"
          withTableBorder={false}
          noRecordsText="Aucun client."
          columns={[
            {
              accessor: "nom",
              title: "Nom / Raison sociale",
              render: (c) => (
                <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                  {nomAffiche(c)}
                </Link>
              ),
            },
            {
              accessor: "telephone",
              title: "Téléphone",
              render: (c) => <span className="font-mono tabular-nums">{c.telephone}</span>,
            },
            {
              accessor: "nif",
              title: "NIF",
              render: (c) => (c.nif ? <Badge color="gray" variant="light">NIF</Badge> : "—"),
            },
            {
              accessor: "actif",
              title: "Statut",
              render: (c) => (
                <Badge color={c.actif ? "green" : "gray"} variant="light">
                  {c.actif ? "Actif" : "Inactif"}
                </Badge>
              ),
            },
            {
              accessor: "actions",
              title: "Actions",
              textAlign: "right",
              render: (c) => (
                <Group justify="flex-end" gap="xs">
                  <Button component={Link} href={`/clients/${c.id}`} variant="subtle" size="xs">
                    Voir
                  </Button>
                  {peutEcrire && (
                    <>
                      {/* Corriger un numéro de téléphone obligeait à ouvrir la
                          fiche pour y trouver le même formulaire : deux
                          chargements de page pour une faute de frappe. Le
                          dialogue est celui de la fiche, à l'identique. */}
                      <ClientFormDialog
                        action={modifierClient.bind(null, c.id)}
                        client={c}
                        trigger={
                          <Button variant="subtle" size="xs">
                            Modifier
                          </Button>
                        }
                      />
                      <form action={basculerActifClient.bind(null, c.id, !c.actif)}>
                        <Button type="submit" variant="subtle" size="xs">
                          {c.actif ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </>
                  )}
                </Group>
              ),
            },
          ]}
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
