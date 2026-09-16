import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, proformas } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import {
  STATUTS_PROFORMA,
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { Button, Group, Paper, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { ProformasTable } from "./proformas-table";

/** Nombre de proformas affichées par page. */
const PAR_PAGE = 50;

export default async function PageProformas({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "factures:read");
  const params = await searchParams;
  const { statut, du, au } = params;
  const pageDemandee = lirePage(params.page);

  const statutFiltre = lireStatut(statut, STATUTS_PROFORMA);
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    statutFiltre ? eq(proformas.statut, statutFiltre) : undefined,
    debut ? gte(proformas.dateProforma, debut) : undefined,
    fin ? lte(proformas.dateProforma, fin) : undefined,
  ].filter(Boolean);
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  const [comptes, liste] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(proformas)
      .innerJoin(clients, eq(proformas.clientId, clients.id))
      .where(filtre),
    db
      .select({
        id: proformas.id,
        numero: proformas.numero,
        dateProforma: proformas.dateProforma,
        dateValidite: proformas.dateValidite,
        montantTotal: proformas.montantTotal,
        statut: proformas.statut,
        clientNom: clients.nom,
        clientPrenom: clients.prenom,
        clientRaisonSociale: clients.raisonSociale,
      })
      .from(proformas)
      .innerJoin(clients, eq(proformas.clientId, clients.id))
      .where(filtre)
      // L'`id` départage deux proformas du même jour, sinon l'ordre peut
      // changer d'une page à l'autre et une ligne se répète ou disparaît.
      .orderBy(desc(proformas.dateProforma), desc(proformas.id))
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/proformas", params, pageCourante));
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={1} size="h2">Proformas</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Chiffrages remis aux clients avant facturation. Une proforma n&apos;entre ni dans le
          chiffre d&apos;affaires, ni dans les impayés, ni en caisse.
        </Text>
      </div>

      <form>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <Select
            label="Statut"
            name="statut"
            defaultValue={statutFiltre}
            placeholder="Tous"
            clearable
            w={160}
            data={STATUTS_PROFORMA.map((s) => ({ value: s, label: libelle(STATUT_PROFORMA_LABEL, s) }))}
          />
          <TextInput label="Du" name="du" type="date" defaultValue={du} />
          <TextInput label="Au" name="au" type="date" defaultValue={au} />
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          {(statut || du || au) && (
            <Button variant="subtle" component={Link} href="/proformas">
              Réinitialiser
            </Button>
          )}
        </Group>
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <ProformasTable liste={liste} />
      </Paper>

      <PaginationListe
        base="/proformas"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="proforma"
      />
    </Stack>
  );
}
