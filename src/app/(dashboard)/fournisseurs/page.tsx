import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { fournisseurs } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Group, Paper, Stack, TextInput, Title } from "@mantine/core";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { FournisseursTable } from "./fournisseurs-table";
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
        <FournisseursTable
          liste={liste}
          peutEcrire={peutEcrire}
          modifierFournisseur={modifierFournisseur}
          basculerActifFournisseur={basculerActifFournisseur}
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
