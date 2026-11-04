import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gte, lte, sql } from "drizzle-orm";
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
import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { ProformasTable } from "./proformas-table";
import { EnTetePage } from "@/components/shared/en-tete-page";
import { FileSignature } from "lucide-react";
import { ChampDate } from "@/components/shared/champ-date";
import { OngletsStatut } from "@/components/shared/onglets-statut";
import { lireTri } from "@/lib/tri";
import { BoutonExport } from "@/components/shared/bouton-export";

/** Nombre de proformas affichées par page. */
const PAR_PAGE = 50;

export default async function PageProformas({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string; tri?: string; ordre?: string; supprimee?: string }>;
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

  const tri = lireTri(
    {
      numero: proformas.numero,
      client: clients.nom,
      dateProforma: proformas.dateProforma,
      dateValidite: proformas.dateValidite,
      statut: proformas.statut,
      montantTotal: proformas.montantTotal,
    },
    params,
    { colonne: "dateProforma", ordre: "desc" },
    proformas.id,
  );

  // Compteurs des onglets de statut : même période, tous statuts confondus.
  const conditionsPeriode = [
    debut ? gte(proformas.dateProforma, debut) : undefined,
    fin ? lte(proformas.dateProforma, fin) : undefined,
  ].filter(Boolean);
  const repartitionStatuts = await db
    .select({ statut: proformas.statut, n: sql<number>`count(*)::int` })
    .from(proformas)
    .where(conditionsPeriode.length > 0 ? and(...conditionsPeriode) : undefined)
    .groupBy(proformas.statut);
  const compteursStatuts = Object.fromEntries(repartitionStatuts.map((r) => [r.statut, r.n]));

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
      .orderBy(...tri.orderBy)
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
        <EnTetePage icone={FileSignature} couleur="violet" titre="Proformas" />
        <Text size="sm" c="dimmed" mt={4}>
          Chiffrages remis aux clients avant facturation. Une proforma n&apos;entre ni dans le
          chiffre d&apos;affaires, ni dans les impayés, ni en caisse.
        </Text>
      </div>

      {params.supprimee === "1" && (
        <Alert color="green" variant="light">
          La proforma annulée a été supprimée définitivement.
        </Alert>
      )}

      <OngletsStatut
        base="/proformas"
        params={params}
        statuts={STATUTS_PROFORMA.map((s) => ({ valeur: s, libelle: libelle(STATUT_PROFORMA_LABEL, s) }))}
        compteurs={compteursStatuts}
        actif={statutFiltre}
      />

      <Paper withBorder radius="lg" p="md">
        <form>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <input type="hidden" name="statut" value={statutFiltre ?? ""} />
            <ChampDate label="Du" name="du" defaultValue={du} />
            <ChampDate label="Au" name="au" defaultValue={au} />
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
            {(statut || du || au) && (
              <Button variant="subtle" component={Link} href="/proformas">
                Réinitialiser
              </Button>
            )}
            <BoutonExport href="/proformas/export" params={params} />
          </Group>
        </form>
      </Paper>

      <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
        <ProformasTable tri={{ colonne: tri.colonne, ordre: tri.ordre }} liste={liste} />
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
