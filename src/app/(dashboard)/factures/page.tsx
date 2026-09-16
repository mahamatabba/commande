import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, factures } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import {
  STATUTS_FACTURE,
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { Button, Group, Paper, Select, Stack, TextInput, Title } from "@mantine/core";
import { FacturesTable } from "./factures-table";

/** Nombre de factures affichées par page. */
const PAR_PAGE = 50;

export default async function PageFactures({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "factures:read");
  // Le superviseur voit le chiffre d'affaires (montants) mais jamais le détail
  // des impayés/créances : cette colonne n'est donc même pas sélectionnée en
  // base pour lui, conformément à la règle "filtrer à la source".
  const peutVoirImpayes = can(session, "impayes:read");
  const params = await searchParams;
  const { statut, du, au } = params;
  const pageDemandee = lirePage(params.page);

  // Les filtres viennent de l'URL : un statut inconnu ou une date mal formée
  // sont écartés au lieu d'être transmis tels quels à PostgreSQL.
  const statutFiltre = lireStatut(statut, STATUTS_FACTURE);
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    statutFiltre ? eq(factures.statut, statutFiltre) : undefined,
    debut ? gte(factures.dateFacture, debut) : undefined,
    fin ? lte(factures.dateFacture, fin) : undefined,
  ].filter(Boolean);
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  // Comptage et page de résultats sont indépendants : lancés ensemble, ils ne
  // coûtent qu'un aller-retour au lieu de deux. Compter en base plutôt que
  // `liste.length` est la raison d'être de la pagination : on ne rapatrie plus
  // l'intégralité du fichier des ventes pour afficher vingt lignes.
  const [comptes, liste] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(factures)
      .innerJoin(clients, eq(factures.clientId, clients.id))
      .where(filtre),
    db
      .select({
        id: factures.id,
        numero: factures.numero,
        dateFacture: factures.dateFacture,
        montantTotal: factures.montantTotal,
        statut: peutVoirImpayes ? factures.statut : sql<string | null>`NULL`,
        resteAPayer: peutVoirImpayes ? factures.resteAPayer : sql<number | null>`NULL`,
        clientNom: clients.nom,
        clientPrenom: clients.prenom,
        clientRaisonSociale: clients.raisonSociale,
      })
      .from(factures)
      .innerJoin(clients, eq(factures.clientId, clients.id))
      .where(filtre)
      // L'`id` départage deux factures du même jour : sans lui, PostgreSQL est
      // libre de renvoyer les lignes dans un ordre différent d'une page à
      // l'autre, et la même facture apparaît deux fois ou disparaît.
      .orderBy(desc(factures.dateFacture), desc(factures.id))
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  // Page au-delà de la dernière (filtre resserré depuis la page 4, favori
  // périmé) : on renvoie sur la dernière page réelle plutôt que d'afficher un
  // « aucune facture » trompeur alors que la liste en contient.
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/factures", params, pageCourante));
  }

  return (
    <Stack gap="md">
      <Title order={1} size="h2">Factures</Title>

      <form>
        <Group align="flex-end" wrap="wrap" gap="sm">
          {peutVoirImpayes && (
            <Select
              label="Statut"
              name="statut"
              defaultValue={statutFiltre}
              placeholder="Tous"
              clearable
              w={160}
              data={STATUTS_FACTURE.map((s) => ({ value: s, label: libelle(STATUT_FACTURE_LABEL, s) }))}
            />
          )}
          <TextInput label="Du" name="du" type="date" defaultValue={du} />
          <TextInput label="Au" name="au" type="date" defaultValue={au} />
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          {(statut || du || au) && (
            <Button variant="subtle" component={Link} href="/factures">
              Réinitialiser
            </Button>
          )}
        </Group>
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <FacturesTable liste={liste} peutVoirImpayes={peutVoirImpayes} />
      </Paper>

      <PaginationListe
        base="/factures"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="facture"
      />
    </Stack>
  );
}
