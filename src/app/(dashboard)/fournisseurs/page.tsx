import Link from "next/link";
import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { fournisseurs } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Badge, Button, Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { creerFournisseur, modifierFournisseur, basculerActifFournisseur } from "./actions";

/** Nombre de fournisseurs affichés par page. */
const PAR_PAGE = 50;

export default async function PageFournisseurs({
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
    ? or(ilike(fournisseurs.nom, `%${q}%`), ilike(fournisseurs.telephone, `%${q}%`))
    : undefined;

  const [comptes, liste] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(fournisseurs).where(filtre),
    db
      .select()
      .from(fournisseurs)
      .where(filtre)
      // L'`id` fige l'ordre entre homonymes, sinon une ligne peut se répéter
      // d'une page à l'autre pendant qu'une autre disparaît.
      .orderBy(fournisseurs.nom, fournisseurs.id)
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/fournisseurs", params, pageCourante));
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Fournisseurs</Title>
        {peutEcrire && <FournisseurFormDialog action={creerFournisseur} />}
      </Group>

      <form className="max-w-sm">
        <TextInput name="q" placeholder="Rechercher un fournisseur..." defaultValue={q} />
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          records={liste}
          idAccessor="id"
          withTableBorder={false}
          noRecordsText="Aucun fournisseur."
          columns={[
            {
              accessor: "nom",
              title: "Nom",
              render: (f) => (
                <Link href={`/fournisseurs/${f.id}`} className="font-medium hover:underline">
                  {f.nom}
                </Link>
              ),
            },
            {
              accessor: "telephone",
              title: "Téléphone",
              render: (f) => <span className="font-mono tabular-nums">{f.telephone}</span>,
            },
            { accessor: "email", title: "Email", render: (f) => f.email ?? "—" },
            {
              accessor: "nif",
              title: "NIF",
              render: (f) => (f.nif ? <Badge color="gray" variant="light">NIF</Badge> : "—"),
            },
            {
              accessor: "actif",
              title: "Statut",
              render: (f) => (
                <Badge color={f.actif ? "green" : "gray"} variant="light">
                  {f.actif ? "Actif" : "Inactif"}
                </Badge>
              ),
            },
            {
              accessor: "actions",
              title: "Actions",
              textAlign: "right",
              render: (f) => (
                <Group justify="flex-end" gap="xs">
                  <Button component={Link} href={`/fournisseurs/${f.id}`} variant="subtle" size="xs">
                    Voir
                  </Button>
                  {peutEcrire && (
                    <>
                      {/* Même dialogue que sur la fiche : corriger un
                          téléphone ne demande plus d'ouvrir une page. */}
                      <FournisseurFormDialog
                        action={modifierFournisseur.bind(null, f.id)}
                        fournisseur={f}
                        trigger={
                          <Button variant="subtle" size="xs">
                            Modifier
                          </Button>
                        }
                      />
                      <form action={basculerActifFournisseur.bind(null, f.id, !f.actif)}>
                        <Button type="submit" variant="subtle" size="xs">
                          {f.actif ? "Désactiver" : "Activer"}
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
        base="/fournisseurs"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="fournisseur"
      />
    </Stack>
  );
}
