import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gte, lte, sql } from "drizzle-orm";
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
import { Button, Group, Paper, Stack } from "@mantine/core";
import { CommandesClientTable } from "./commandes-client-table";
import { EnTetePage } from "@/components/shared/en-tete-page";
import { ShoppingBag } from "lucide-react";
import { ChampDate } from "@/components/shared/champ-date";
import { OngletsStatut } from "@/components/shared/onglets-statut";
import { lireTri } from "@/lib/tri";
import { BoutonExport } from "@/components/shared/bouton-export";

/** Nombre de ventes affichées par page. */
const PAR_PAGE = 50;

export default async function PageCommandesClient({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string; tri?: string; ordre?: string }>;
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

  const tri = lireTri(
    {
      numero: commandesClient.numero,
      client: clients.nom,
      dateCommande: commandesClient.dateCommande,
      modeReglement: commandesClient.modeReglement,
      statut: commandesClient.statut,
      montantTotal: commandesClient.montantTotal,
    },
    params,
    { colonne: "dateCommande", ordre: "desc" },
    commandesClient.id,
  );

  // Compteurs des onglets de statut : même période, tous statuts confondus.
  const conditionsPeriode = [
    debut ? gte(commandesClient.dateCommande, debut) : undefined,
    fin ? lte(commandesClient.dateCommande, fin) : undefined,
  ].filter(Boolean);
  const repartitionStatuts = await db
    .select({ statut: commandesClient.statut, n: sql<number>`count(*)::int` })
    .from(commandesClient)
    .where(conditionsPeriode.length > 0 ? and(...conditionsPeriode) : undefined)
    .groupBy(commandesClient.statut);
  const compteursStatuts = Object.fromEntries(repartitionStatuts.map((r) => [r.statut, r.n]));

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
      .orderBy(...tri.orderBy)
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
        <EnTetePage icone={ShoppingBag} couleur="brand" titre="Ventes" description="Ventes aux clients, à facturer ou à chiffrer en proforma." />
        {peutEcrire && (
          <Button component={Link} href="/commandes-client/nouvelle">
            Nouvelle vente
          </Button>
        )}
      </Group>

      <OngletsStatut
        base="/commandes-client"
        params={params}
        statuts={STATUTS_COMMANDE_CLIENT.map((s) => ({ valeur: s, libelle: libelle(STATUT_COMMANDE_CLIENT_LABEL, s) }))}
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
              <Button variant="subtle" component={Link} href="/commandes-client">
                Réinitialiser
              </Button>
            )}
            <BoutonExport href="/commandes-client/export" params={params} />
          </Group>
        </form>
      </Paper>

      <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
        <CommandesClientTable tri={{ colonne: tri.colonne, ordre: tri.ordre }} commandes={commandes} />
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
