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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const [achatsMensuels, topFournisseurs] = peutVoirAchats
    ? await Promise.all([
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
    : [[], []];

  const [ventesMensuelles, topClientsBruts, repartitionModeBrute, margeMensuelle] = peutVoirVentes
    ? await Promise.all([
        db
          .select({
            mois: sql<string>`date_trunc('month', ${factures.dateFacture})`,
            total: sql<string>`SUM(${factures.montantTotal})`,
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
            total: sql<string>`SUM(${factures.montantTotal})`,
          })
          .from(factures)
          .innerJoin(clients, eq(clients.id, factures.clientId))
          .where(ne(factures.statut, "ANNULEE"))
          .groupBy(clients.id, clients.nom, clients.prenom, clients.raisonSociale)
          .orderBy(sql`SUM(${factures.montantTotal}) DESC`)
          .limit(5),
        db
          .select({
            modeReglement: commandesClient.modeReglement,
            total: sql<string>`SUM(${commandesClient.montantTotal})`,
          })
          .from(commandesClient)
          .where(ne(commandesClient.statut, "ANNULEE"))
          .groupBy(commandesClient.modeReglement),
        db
          .select({
            mois: sql<string>`date_trunc('month', ${factures.dateFacture})`,
            marge: sql<string>`SUM(${lignesCommandeClient.quantite} * (${lignesCommandeClient.prixUnitaire} - ${articles.prixAchatIndicatif}))`,
          })
          .from(factures)
          .innerJoin(lignesCommandeClient, eq(lignesCommandeClient.commandeId, factures.commandeClientId))
          .innerJoin(articles, eq(articles.id, lignesCommandeClient.articleId))
          .where(and(ne(factures.statut, "ANNULEE"), gte(factures.dateFacture, debut)))
          .groupBy(sql`1`),
      ])
    : [[], [], [], []];

  const achats = serieMensuelle(achatsMensuels);
  const ventes = serieMensuelle(ventesMensuelles);
  const marge = serieMensuelle(margeMensuelle.map((m) => ({ mois: m.mois, total: m.marge })));

  const topClients = topClientsBruts.map((c) => ({ nom: nomAffiche(c), valeur: Number(c.total) }));

  const especesTotal =
    Number(repartitionModeBrute.find((r) => r.modeReglement === "ESPECES")?.total ?? 0);
  const bonDeCommandeTotal =
    Number(repartitionModeBrute.find((r) => r.modeReglement === "BON_DE_COMMANDE")?.total ?? 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Statistiques</h1>

      {peutVoirAchats && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Achats</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des achats ({NB_MOIS} derniers mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <EvolutionChart data={achats.data} couleur={CHART_COLORS.bleu} libelleSerie="Achats" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top fournisseurs</CardTitle>
              </CardHeader>
              <CardContent>
                {topFournisseurs.length > 0 ? (
                  <ClassementChart
                    data={topFournisseurs.map((f) => ({ nom: f.nom, valeur: Number(f.total) }))}
                    couleur={CHART_COLORS.bleu}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Aucune donnée.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {peutVoirVentes && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Ventes &amp; marge</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label={`Ventes (${NB_MOIS} derniers mois)`} montant={ventes.totalPeriode} />
            <StatTile
              label={`Marge brute (${NB_MOIS} derniers mois)`}
              montant={marge.totalPeriode}
              note="Lignes rattachées à un article catalogue uniquement"
            />
            <StatTile
              label="Répartition par mode de règlement"
              montant={especesTotal + bonDeCommandeTotal}
              note="Total ventes actives"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des ventes ({NB_MOIS} derniers mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <EvolutionChart data={ventes.data} couleur={CHART_COLORS.orange} libelleSerie="Ventes" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top clients</CardTitle>
              </CardHeader>
              <CardContent>
                {topClients.length > 0 ? (
                  <ClassementChart data={topClients} couleur={CHART_COLORS.orange} />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Aucune donnée.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Mode de règlement des ventes</CardTitle>
            </CardHeader>
            <CardContent>
              {especesTotal + bonDeCommandeTotal > 0 ? (
                <RepartitionChart
                  especes={especesTotal}
                  bonDeCommande={bonDeCommandeTotal}
                  couleurEspeces={CHART_COLORS.bleu}
                  couleurBonDeCommande={CHART_COLORS.orange}
                />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Aucune donnée.</p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <details className="rounded-lg border border-border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">Voir les données en tableau</summary>
        <div className="mt-4 space-y-4">
          {peutVoirAchats && (
            <div>
              <p className="mb-1 font-medium">Achats par mois</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {achats.data.map((p) => (
                  <li key={p.cle}>
                    {p.label} : <span className="font-mono tabular-nums">{formatMontant(p.valeur)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {peutVoirVentes && (
            <div>
              <p className="mb-1 font-medium">Ventes par mois</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {ventes.data.map((p) => (
                  <li key={p.cle}>
                    {p.label} : <span className="font-mono tabular-nums">{formatMontant(p.valeur)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
