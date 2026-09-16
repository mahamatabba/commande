import { and, eq, gte, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  articles,
  clients,
  commandesClient,
  commandesFournisseur,
  factures,
  fournisseurs,
  lignesCommandeClient,
} from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { CHART_COLORS } from "@/lib/constants";
import { formatMontant } from "@/lib/format";
import { cleMois, debutPeriode, derniersMois, libelleMois } from "@/lib/stats";
import { Card, List, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { EvolutionChart } from "@/components/statistiques/evolution-chart";
import { ClassementChart } from "@/components/statistiques/classement-chart";
import { RepartitionChart } from "@/components/statistiques/repartition-chart";
import { StatTile } from "@/components/statistiques/stat-tile";

const NB_MOIS = 6;

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

function serieMensuelle(lignes: { mois: string; total: string }[]): {
  data: { cle: string; label: string; valeur: number }[];
  totalPeriode: number;
} {
  const parCle = new Map(lignes.map((l) => [cleMois(l.mois), Number(l.total)]));
  const cles = derniersMois(NB_MOIS);
  const data = cles.map((cle) => ({ cle, label: libelleMois(cle), valeur: parCle.get(cle) ?? 0 }));
  return { data, totalPeriode: data.reduce((s, p) => s + p.valeur, 0) };
}

export default async function PageStatistiques() {
  const session = await auth();
  const peutVoirAchats = can(session, "statistiques:achats_sorties");
  const peutVoirVentes = can(session, "statistiques:globales_marge");
  if (!peutVoirAchats && !peutVoirVentes) {
    requirePermission(session, "statistiques:achats_sorties");
  }
  const debut = debutPeriode(NB_MOIS);

  // Les deux blocs ne dépendent pas l'un de l'autre. Déclarés sans `await`,
  // ils partent ensemble : la page attend une fois au lieu de deux.
  const promesseAchats = peutVoirAchats
    ? Promise.all([
        db
          .select({
            mois: sql<string>`date_trunc('month', ${commandesFournisseur.dateCommande})`,
            total: sql<string>`SUM(${commandesFournisseur.montantTotal})`,
          })
          .from(commandesFournisseur)
          .where(
            and(ne(commandesFournisseur.statut, "ANNULEE"), gte(commandesFournisseur.dateCommande, debut)),
          )
          .groupBy(sql`1`),
        db
          .select({
            nom: fournisseurs.nom,
            total: sql<string>`SUM(${commandesFournisseur.montantTotal})`,
          })
          .from(commandesFournisseur)
          .innerJoin(fournisseurs, eq(fournisseurs.id, commandesFournisseur.fournisseurId))
          .where(ne(commandesFournisseur.statut, "ANNULEE"))
          .groupBy(fournisseurs.id, fournisseurs.nom)
          .orderBy(sql`SUM(${commandesFournisseur.montantTotal}) DESC`)
          .limit(5),
      ])
    : Promise.resolve([[], []]);

  const promesseVentes = peutVoirVentes
    ? Promise.all([
        // Chiffre d'affaires HORS TAXE : la TVA est collectée pour l'État, elle
        // n'est pas un produit de l'entreprise. C'est aussi la seule base
        // comparable à la marge, calculée sur des prix HT.
        db
          .select({
            mois: sql<string>`date_trunc('month', ${factures.dateFacture})`,
            total: sql<string>`SUM(${factures.montantHt})`,
          })
          .from(factures)
          .where(and(ne(factures.statut, "ANNULEE"), gte(factures.dateFacture, debut)))
          .groupBy(sql`1`),
        db
          .select({
            clientId: clients.id,
            nom: clients.nom,
            prenom: clients.prenom,
            raisonSociale: clients.raisonSociale,
            total: sql<string>`SUM(${factures.montantHt})`,
          })
          .from(factures)
          .innerJoin(clients, eq(clients.id, factures.clientId))
          .where(ne(factures.statut, "ANNULEE"))
          .groupBy(clients.id, clients.nom, clients.prenom, clients.raisonSociale)
          .orderBy(sql`SUM(${factures.montantHt}) DESC`)
          .limit(5),
        db
          .select({
            modeReglement: commandesClient.modeReglement,
            total: sql<string>`SUM(${commandesClient.montantTotal})`,
          })
          .from(commandesClient)
          .where(ne(commandesClient.statut, "ANNULEE"))
          .groupBy(commandesClient.modeReglement),
        // Marge brute : on utilise en priorité le prix d'achat FIGÉ sur la
        // ligne au moment de la vente. Le tarif actuel du catalogue ne sert
        // que de repli pour les ventes antérieures à cet enregistrement —
        // sinon une hausse de tarif réécrirait la marge des mois passés.
        // Jointure gauche sur les articles : une ligne libre (hors catalogue)
        // ne doit pas faire disparaître la vente du calcul, elle est
        // simplement comptée pour une marge nulle faute de coût connu.
        db
          .select({
            mois: sql<string>`date_trunc('month', ${factures.dateFacture})`,
            marge: sql<string>`SUM(
              CASE WHEN COALESCE(${lignesCommandeClient.prixAchatUnitaire}, ${articles.prixAchatIndicatif}) IS NULL
                THEN 0
                ELSE ${lignesCommandeClient.quantite} * (${lignesCommandeClient.prixUnitaire} - COALESCE(${lignesCommandeClient.prixAchatUnitaire}, ${articles.prixAchatIndicatif}))
              END
            )`,
          })
          .from(factures)
          .innerJoin(lignesCommandeClient, eq(lignesCommandeClient.commandeId, factures.commandeClientId))
          .leftJoin(articles, eq(articles.id, lignesCommandeClient.articleId))
          .where(and(ne(factures.statut, "ANNULEE"), gte(factures.dateFacture, debut)))
          .groupBy(sql`1`),
      ])
    : Promise.resolve([[], [], [], []]);

  const [achatsMensuels, topFournisseurs] = await promesseAchats;
  const [ventesMensuelles, topClientsBruts, repartitionModeBrute, margeMensuelle] =
    await promesseVentes;

  const achats = serieMensuelle(achatsMensuels);
  const ventes = serieMensuelle(ventesMensuelles);
  const marge = serieMensuelle(margeMensuelle.map((m) => ({ mois: m.mois, total: m.marge })));

  const topClients = topClientsBruts.map((c) => ({ nom: nomAffiche(c), valeur: Number(c.total) }));

  const especesTotal =
    Number(repartitionModeBrute.find((r) => r.modeReglement === "ESPECES")?.total ?? 0);
  const bonDeCommandeTotal =
    Number(repartitionModeBrute.find((r) => r.modeReglement === "BON_DE_COMMANDE")?.total ?? 0);

  return (
    <Stack gap="xl">
      <Title order={1} size="h2">Statistiques</Title>

      {peutVoirAchats && (
        <Stack gap="md">
          <Title order={2} size="h4">Achats</Title>
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            <Card withBorder radius="md">
              <Title order={3} size="h5" mb="sm">Évolution des achats ({NB_MOIS} derniers mois)</Title>
              <EvolutionChart data={achats.data} couleur={CHART_COLORS.bleu} libelleSerie="Achats" />
            </Card>
            <Card withBorder radius="md">
              <Title order={3} size="h5" mb="sm">Top fournisseurs</Title>
              {topFournisseurs.length > 0 ? (
                <ClassementChart
                  data={topFournisseurs.map((f) => ({ nom: f.nom, valeur: Number(f.total) }))}
                  couleur={CHART_COLORS.bleu}
                />
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="lg">Aucune donnée.</Text>
              )}
            </Card>
          </SimpleGrid>
        </Stack>
      )}

      {peutVoirVentes && (
        <Stack gap="md">
          <Title order={2} size="h4">Ventes &amp; marge</Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <StatTile
              label={`Ventes HT (${NB_MOIS} derniers mois)`}
              montant={ventes.totalPeriode}
              note="Hors TVA collectée"
            />
            <StatTile
              label={`Marge brute (${NB_MOIS} derniers mois)`}
              montant={marge.totalPeriode}
              note="Lignes dont le prix d'achat est connu"
            />
            <StatTile
              label="Répartition par mode de règlement"
              montant={especesTotal + bonDeCommandeTotal}
              note="Total ventes actives"
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            <Card withBorder radius="md">
              <Title order={3} size="h5" mb="sm">Évolution des ventes HT ({NB_MOIS} derniers mois)</Title>
              <EvolutionChart data={ventes.data} couleur={CHART_COLORS.orange} libelleSerie="Ventes" />
            </Card>
            <Card withBorder radius="md">
              <Title order={3} size="h5" mb="sm">Top clients</Title>
              {topClients.length > 0 ? (
                <ClassementChart data={topClients} couleur={CHART_COLORS.orange} />
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="lg">Aucune donnée.</Text>
              )}
            </Card>
          </SimpleGrid>
          <Card withBorder radius="md">
            <Title order={3} size="h5" mb="sm">Mode de règlement des ventes</Title>
            {especesTotal + bonDeCommandeTotal > 0 ? (
              <RepartitionChart
                especes={especesTotal}
                bonDeCommande={bonDeCommandeTotal}
                couleurEspeces={CHART_COLORS.bleu}
                couleurBonDeCommande={CHART_COLORS.orange}
              />
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="lg">Aucune donnée.</Text>
            )}
          </Card>
        </Stack>
      )}

      <Paper withBorder radius="md" p="md" component="details">
        <Text component="summary" size="sm" fw={500} style={{ cursor: "pointer" }}>
          Voir les données en tableau
        </Text>
        <Stack gap="md" mt="md">
          {peutVoirAchats && (
            <div>
              <Text size="sm" fw={500} mb={4}>Achats par mois</Text>
              <List size="sm" c="dimmed" listStyleType="none">
                {achats.data.map((p) => (
                  <List.Item key={p.cle}>
                    {p.label} : <span className="font-mono tabular-nums">{formatMontant(p.valeur)}</span>
                  </List.Item>
                ))}
              </List>
            </div>
          )}
          {peutVoirVentes && (
            <div>
              <Text size="sm" fw={500} mb={4}>Ventes HT par mois</Text>
              <List size="sm" c="dimmed" listStyleType="none">
                {ventes.data.map((p) => (
                  <List.Item key={p.cle}>
                    {p.label} : <span className="font-mono tabular-nums">{formatMontant(p.valeur)}</span>
                  </List.Item>
                ))}
              </List>
            </div>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
