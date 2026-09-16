import { redirect } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, factures, clients, fournisseurs, reglements } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { Group, Paper, Stack, Title } from "@mantine/core";
import { ReglementForm } from "@/components/reglements/reglement-form";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { ReglementsTable } from "./reglements-table";

/** Nombre de règlements affichés par page dans l'historique. */
const PAR_PAGE = 50;

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageReglements({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "reglements:saisir");

  const params = await searchParams;
  const pageDemandee = lirePage(params.page);

  // Les trois lectures sont indépendantes : on les lance ensemble. Seul
  // l'historique doit attendre, puisqu'il lui faut le nombre de pages.
  const [facturesEligibles, commandesEligibles, comptes] = await Promise.all([
    db
      .select({
        id: factures.id,
        numero: factures.numero,
        resteAPayer: factures.resteAPayer,
        clientNom: clients.nom,
        clientPrenom: clients.prenom,
        clientRaisonSociale: clients.raisonSociale,
      })
      .from(factures)
      .innerJoin(clients, eq(clients.id, factures.clientId))
      .where(inArray(factures.statut, ["NON_PAYEE", "PARTIELLEMENT_PAYEE"])),
    db
      .select({
        id: commandesFournisseur.id,
        numero: commandesFournisseur.numero,
        montantTotal: commandesFournisseur.montantTotal,
        montantRegle: commandesFournisseur.montantRegle,
        fournisseurNom: fournisseurs.nom,
      })
      .from(commandesFournisseur)
      .innerJoin(fournisseurs, eq(fournisseurs.id, commandesFournisseur.fournisseurId))
      // Un achat encore en brouillon n'engage rien : il ne doit pas apparaître
      // dans les cibles de règlement, sinon on décaisse pour une commande qui
      // peut encore changer de montant ou ne jamais être passée.
      .where(inArray(commandesFournisseur.statut, ["VALIDEE", "RECUE"])),
    db.select({ total: sql<number>`count(*)::int` }).from(reglements),
  ]);

  const commandesAvecReste = commandesEligibles
    .map((c) => ({ ...c, resteAPayer: c.montantTotal - c.montantRegle }))
    .filter((c) => c.resteAPayer > 0);

  const totalReglements = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante, decalage } = bornerPagination(
    pageDemandee,
    totalReglements,
    PAR_PAGE,
  );
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/reglements", params, pageCourante));
  }

  const historique = await db.query.reglements.findMany({
    with: {
      facture: { with: { client: true } },
      commandeFournisseur: { with: { fournisseur: true } },
    },
    // L'`id` départage deux règlements enregistrés dans la même milliseconde ;
    // sans lui, l'ordre peut changer d'une page à l'autre.
    orderBy: (r, { desc }) => [desc(r.createdAt), desc(r.id)],
    limit: PAR_PAGE,
    offset: decalage,
  });

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Règlements</Title>
        <ReglementForm
          factures={facturesEligibles.map((f) => ({
            id: f.id,
            numero: f.numero,
            nomAffiche: nomAffiche({
              nom: f.clientNom,
              prenom: f.clientPrenom,
              raisonSociale: f.clientRaisonSociale,
            }),
            resteAPayer: f.resteAPayer ?? 0,
          }))}
          commandes={commandesAvecReste.map((c) => ({
            id: c.id,
            numero: c.numero,
            fournisseurNom: c.fournisseurNom,
            resteAPayer: c.resteAPayer,
          }))}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <ReglementsTable historique={historique} />
      </Paper>

      <PaginationListe
        base="/reglements"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={totalReglements}
        nom="règlement"
      />
    </Stack>
  );
}
