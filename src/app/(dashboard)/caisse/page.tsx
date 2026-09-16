import { redirect } from "next/navigation";
import { and, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { mouvementsCaisse } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { calculerSoldeCaisse } from "@/lib/caisse";
import { formatDate, formatMontant } from "@/lib/format";
import { bornerDebut, bornerFin, bornerPagination, lienPagination, lirePage } from "@/lib/filtres";
import { SENS_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import { Badge, Button, Group, Paper, SimpleGrid, Stack, TextInput, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { StatTile } from "@/components/statistiques/stat-tile";
import { PaginationListe } from "@/components/shared/pagination-liste";

/** Nombre de mouvements affichés par page. */
const PAR_PAGE = 100;

const SENS_BADGE: Record<string, { color: string; variant: "light" }> = {
  ENCAISSEMENT: { color: "green", variant: "light" },
  DECAISSEMENT: { color: "red", variant: "light" },
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageCaisse({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "caisse:solde:read");
  const params = await searchParams;
  const { du, au } = params;

  const debut = bornerDebut(du);
  const fin = bornerFin(au);
  const conditions = [];
  if (debut) conditions.push(gte(mouvementsCaisse.dateMouvement, debut));
  if (fin) conditions.push(lte(mouvementsCaisse.dateMouvement, fin));
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  // Le solde global et les totaux de la période sont indépendants : lancés
  // ensemble, ils ne coûtent qu'un aller-retour au lieu de deux.
  //
  // Totaux et comptage sont calculés en base sur TOUTE la période demandée :
  // les additionner à partir des seules lignes chargées donnait un « total »
  // qui changeait au fil de la pagination.
  const [solde, agregatsRows] = await Promise.all([
    calculerSoldeCaisse(db),
    db
      .select({
        encaissements: sql<string>`COALESCE(SUM(CASE WHEN ${mouvementsCaisse.sens} = 'ENCAISSEMENT' THEN ${mouvementsCaisse.montant} ELSE 0 END), 0)`,
        decaissements: sql<string>`COALESCE(SUM(CASE WHEN ${mouvementsCaisse.sens} = 'DECAISSEMENT' THEN ${mouvementsCaisse.montant} ELSE 0 END), 0)`,
        nombre: sql<number>`count(*)::int`,
      })
      .from(mouvementsCaisse)
      .where(filtre),
  ]);

  const agregats = agregatsRows[0];
  const totalEncaissements = Number(agregats?.encaissements ?? 0);
  const totalDecaissements = Number(agregats?.decaissements ?? 0);
  const nombreMouvements = agregats?.nombre ?? 0;
  const pageDemandee = lirePage(params.page);
  const { nbPages, pageCourante, decalage } = bornerPagination(
    pageDemandee,
    nombreMouvements,
    PAR_PAGE,
  );
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/caisse", params, pageCourante));
  }

  const mouvements = await db.query.mouvementsCaisse.findMany({
    where: filtre,
    with: {
      reglement: {
        with: {
          facture: { with: { client: true } },
          commandeFournisseur: { with: { fournisseur: true } },
        },
      },
    },
    // L'`id` départage les mouvements d'une même journée, sinon l'ordre varie
    // d'une requête à l'autre et le solde progressif devient incohérent.
    orderBy: (m, { desc }) => [desc(m.dateMouvement), desc(m.id)],
    limit: PAR_PAGE,
    offset: decalage,
  });

  // Solde progressif recalculé chronologiquement. La colonne `soldeApres`
  // stockée suit l'ordre de SAISIE : un règlement antidaté la rend fausse à
  // l'affichage. On repart donc du solde cumulé juste avant la plus ancienne
  // ligne affichée, puis on remonte.
  const plusAncien = mouvements.at(-1);
  let cumul = 0;
  if (plusAncien) {
    const [row] = await db
      .select({
        solde: sql<string>`COALESCE(SUM(CASE WHEN ${mouvementsCaisse.sens} = 'ENCAISSEMENT' THEN ${mouvementsCaisse.montant} ELSE -${mouvementsCaisse.montant} END), 0)`,
      })
      .from(mouvementsCaisse)
      .where(
        sql`(${mouvementsCaisse.dateMouvement}, ${mouvementsCaisse.id}) < (${plusAncien.dateMouvement}, ${plusAncien.id})`,
      );
    cumul = Number(row?.solde ?? 0);
  }

  const soldeParMouvement = new Map<number, number>();
  for (const m of [...mouvements].reverse()) {
    cumul += m.sens === "ENCAISSEMENT" ? m.montant : -m.montant;
    soldeParMouvement.set(m.id, cumul);
  }

  return (
    <Stack gap="md">
      <Title order={1} size="h2">Caisse</Title>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <StatTile label="Solde actuel" montant={solde} highlight />
        <StatTile label="Encaissements de la période" montant={totalEncaissements} />
        <StatTile label="Décaissements de la période" montant={totalDecaissements} />
      </SimpleGrid>

      <form>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <TextInput label="Du" name="du" type="date" defaultValue={du} />
          <TextInput label="Au" name="au" type="date" defaultValue={au} />
          <Button type="submit" variant="outline">Filtrer</Button>
        </Group>
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          records={mouvements}
          idAccessor="id"
          withTableBorder={false}
          noRecordsText="Aucun mouvement de caisse."
          columns={[
            {
              accessor: "dateMouvement",
              title: "Date",
              render: (m) => <span className="font-mono tabular-nums">{formatDate(m.dateMouvement)}</span>,
            },
            {
              accessor: "sens",
              title: "Sens",
              render: (m) => (
                <Badge {...SENS_BADGE[m.sens]}>{libelle(SENS_REGLEMENT_LABEL, m.sens)}</Badge>
              ),
            },
            {
              accessor: "origine",
              title: "Origine",
              render: (m) =>
                m.reglement.facture
                  ? `Facture ${m.reglement.facture.numero} — ${nomAffiche(m.reglement.facture.client)}`
                  : m.reglement.commandeFournisseur
                    ? `Achat ${m.reglement.commandeFournisseur.numero} — ${m.reglement.commandeFournisseur.fournisseur.nom}`
                    : "—",
            },
            {
              accessor: "montant",
              title: "Montant",
              textAlign: "right",
              render: (m) => <span className="font-mono tabular-nums">{formatMontant(m.montant)}</span>,
            },
            {
              accessor: "soldeApres",
              title: "Solde après",
              textAlign: "right",
              render: (m) => (
                <span className="font-mono font-medium tabular-nums">
                  {formatMontant(soldeParMouvement.get(m.id) ?? m.soldeApres)}
                </span>
              ),
            },
          ]}
        />
      </Paper>

      <PaginationListe
        base="/caisse"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={nombreMouvements}
        nom="mouvement"
      />
    </Stack>
  );
}
