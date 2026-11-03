import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { fournisseurs } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Group, Paper, Stack, TextInput } from "@mantine/core";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { FournisseursTable } from "./fournisseurs-table";
import { creerFournisseur, modifierFournisseur, basculerActifFournisseur } from "./actions";
import { EnTetePage } from "@/components/shared/en-tete-page";
import { Search } from "lucide-react";
import { Building2 } from "lucide-react";

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
        <EnTetePage icone={Building2} couleur="aei" titre="Fournisseurs" description="Carnet des fournisseurs et de leurs coordonnées." />
        {peutEcrire && <FournisseurFormDialog action={creerFournisseur} />}
      </Group>

      <Paper withBorder radius="lg" p="md">
        <form className="max-w-md">
          <TextInput name="q" placeholder="Rechercher un fournisseur..." defaultValue={q} leftSection={<Search size={16} />} />
        </form>
      </Paper>

      <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
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
