import Link from "next/link";
import { eq, inArray, ne, gte, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, commandesClient, factures, mouvementsCaisse } from "@/db/schema";
import { can } from "@/lib/permissions";
import { calculerSoldeCaisse } from "@/lib/caisse";
import { CHART_COLORS } from "@/lib/constants";
import { cleMois, debutPeriode, derniersMois, libelleMois } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/statistiques/stat-tile";
import { EvolutionChart } from "@/components/statistiques/evolution-chart";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight text-foreground">{children}</h2>;
}

const NB_MOIS_GRAPHIQUE = 6;

function serieMensuelle(lignes: { mois: string; total: string }[]): { cle: string; label: string; valeur: number }[] {
  const parCle = new Map(lignes.map((l) => [cleMois(l.mois), Number(l.total)]));
  return derniersMois(NB_MOIS_GRAPHIQUE).map((cle) => ({ cle, label: libelleMois(cle), valeur: parCle.get(cle) ?? 0 }));
}

function CountTile({ label, valeur, href, note }: { label: string; valeur: number; href: string; note?: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/30 hover:bg-accent">
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{valeur}</p>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function PageTableauDeBord() {
  const session = await auth();
  const debutMois = debutPeriode(1);
  const debutGraphique = debutPeriode(NB_MOIS_GRAPHIQUE);

  const peutCommandesFournisseur = can(session, "commandes_fournisseur:read");
  const peutCommandesClient = can(session, "commandes_client:read");
  const peutFactures = can(session, "factures:read");
  const peutStatsAchats = can(session, "statistiques:achats_sorties");
  const peutStatsVentes = can(session, "statistiques:globales_marge");
  const peutSoldeCaisse = can(session, "caisse:solde:read");
  const peutImpayes = can(session, "impayes:read");
  const peutEncaissements = can(session, "encaissements:read");
  const peutDecaissements = can(session, "decaissements:read");
  const peutUtilisateurs = can(session, "utilisateurs:gerer");
  const peutJournal = can(session, "journal:consulter");

  const afficheActivite = peutCommandesFournisseur || peutCommandesClient || peutFactures;
  const afficheStats = peutStatsAchats || peutStatsVentes;
  const afficheCaisse = peutSoldeCaisse || peutImpayes || peutEncaissements || peutDecaissements;
  const afficheAdmin = peutUtilisateurs || peutJournal;

  const [
    commandesFournisseurEnCours,
    commandesClientEnCours,
    facturesImpayees,
    achatsMoisRows,
    ventesMoisRows,
    soldeCaisse,
    totalImpayesRows,
    encaissementsMoisRows,
    decaissementsMoisRows,
    achatsParMois,
    ventesParMois,
  ] = await Promise.all([
    peutCommandesFournisseur
      ? db
          .select({ n: sql<string>`count(*)` })
          .from(commandesFournisseur)
          .where(eq(commandesFournisseur.statut, "VALIDEE"))
      : Promise.resolve([{ n: "0" }]),
    peutCommandesClient
      ? db
          .select({ n: sql<string>`count(*)` })
          .from(commandesClient)
          .where(eq(commandesClient.statut, "VALIDEE"))
      : Promise.resolve([{ n: "0" }]),
    peutFactures
      ? db
          .select({ n: sql<string>`count(*)` })
          .from(factures)
          .where(inArray(factures.statut, ["NON_PAYEE", "PARTIELLEMENT_PAYEE"]))
      : Promise.resolve([{ n: "0" }]),
    peutStatsAchats
      ? db
          .select({ total: sql<string>`COALESCE(SUM(${commandesFournisseur.montantTotal}), 0)` })
          .from(commandesFournisseur)
          .where(and(ne(commandesFournisseur.statut, "ANNULEE"), gte(commandesFournisseur.dateCommande, debutMois)))
      : Promise.resolve([{ total: "0" }]),
    peutStatsVentes
      ? db
          .select({ total: sql<string>`COALESCE(SUM(${factures.montantTotal}), 0)` })
          .from(factures)
          .where(and(ne(factures.statut, "ANNULEE"), gte(factures.dateFacture, debutMois)))
      : Promise.resolve([{ total: "0" }]),
    peutSoldeCaisse ? calculerSoldeCaisse(db) : Promise.resolve(0),
    peutImpayes
      ? db
          .select({ total: sql<string>`COALESCE(SUM(${factures.resteAPayer}), 0)` })
          .from(factures)
          .where(inArray(factures.statut, ["NON_PAYEE", "PARTIELLEMENT_PAYEE"]))
      : Promise.resolve([{ total: "0" }]),
    peutEncaissements
      ? db
          .select({ total: sql<string>`COALESCE(SUM(${mouvementsCaisse.montant}), 0)` })
          .from(mouvementsCaisse)
          .where(and(eq(mouvementsCaisse.sens, "ENCAISSEMENT"), gte(mouvementsCaisse.dateMouvement, debutMois)))
      : Promise.resolve([{ total: "0" }]),
    peutDecaissements
      ? db
          .select({ total: sql<string>`COALESCE(SUM(${mouvementsCaisse.montant}), 0)` })
          .from(mouvementsCaisse)
          .where(and(eq(mouvementsCaisse.sens, "DECAISSEMENT"), gte(mouvementsCaisse.dateMouvement, debutMois)))
      : Promise.resolve([{ total: "0" }]),
    peutStatsAchats
      ? db
          .select({
            mois: sql<string>`date_trunc('month', ${commandesFournisseur.dateCommande})`,
            total: sql<string>`SUM(${commandesFournisseur.montantTotal})`,
          })
          .from(commandesFournisseur)
          .where(and(ne(commandesFournisseur.statut, "ANNULEE"), gte(commandesFournisseur.dateCommande, debutGraphique)))
          .groupBy(sql`1`)
      : Promise.resolve([]),
    peutStatsVentes
      ? db
          .select({
            mois: sql<string>`date_trunc('month', ${factures.dateFacture})`,
            total: sql<string>`SUM(${factures.montantTotal})`,
          })
          .from(factures)
          .where(and(ne(factures.statut, "ANNULEE"), gte(factures.dateFacture, debutGraphique)))
          .groupBy(sql`1`)
      : Promise.resolve([]),
  ]);

  const achatsSerie = serieMensuelle(achatsParMois);
  const ventesSerie = serieMensuelle(ventesParMois);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Connecté en tant que <strong className="text-foreground">{session!.user.name}</strong> — rôle{" "}
          <strong className="text-foreground">{session!.user.role}</strong>.
        </p>
      </div>

      {afficheActivite && (
        <section className="space-y-4">
          <SectionTitle>Activité en cours</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            {peutCommandesFournisseur && (
              <CountTile
                label="Achats validés"
                valeur={Number(commandesFournisseurEnCours[0]?.n ?? 0)}
                href="/commandes-fournisseur"
                note="En attente de réception"
              />
            )}
            {peutCommandesClient && (
              <CountTile
                label="Ventes validées"
                valeur={Number(commandesClientEnCours[0]?.n ?? 0)}
                href="/commandes-client"
                note="En attente de facturation"
              />
            )}
            {peutFactures && (
              <CountTile
                label="Factures impayées"
                valeur={Number(facturesImpayees[0]?.n ?? 0)}
                href="/factures"
                note="Non soldées ou partiellement réglées"
              />
            )}
          </div>
        </section>
      )}

      {afficheStats && (
        <section className="space-y-4">
          <SectionTitle>Ce mois-ci</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {peutStatsAchats && (
              <StatTile label="Achats fournisseurs" montant={Number(achatsMoisRows[0]?.total ?? 0)} />
            )}
            {peutStatsVentes && (
              <StatTile label="Ventes facturées" montant={Number(ventesMoisRows[0]?.total ?? 0)} />
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {peutStatsAchats && (
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des achats ({NB_MOIS_GRAPHIQUE} derniers mois)</CardTitle>
                </CardHeader>
                <CardContent>
                  <EvolutionChart data={achatsSerie} couleur={CHART_COLORS.bleu} libelleSerie="Achats" />
                </CardContent>
              </Card>
            )}
            {peutStatsVentes && (
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des ventes ({NB_MOIS_GRAPHIQUE} derniers mois)</CardTitle>
                </CardHeader>
                <CardContent>
                  <EvolutionChart data={ventesSerie} couleur={CHART_COLORS.orange} libelleSerie="Ventes" />
                </CardContent>
              </Card>
            )}
          </div>
          <Link href="/statistiques" className="text-sm font-medium text-primary hover:underline">
            Voir les statistiques détaillées →
          </Link>
        </section>
      )}

      {afficheCaisse && (
        <section className="space-y-4">
          <SectionTitle>Caisse</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {peutSoldeCaisse && <StatTile label="Solde de caisse" montant={soldeCaisse} highlight />}
            {peutImpayes && (
              <StatTile label="Total impayés" montant={Number(totalImpayesRows[0]?.total ?? 0)} />
            )}
            {peutEncaissements && (
              <StatTile label="Encaissements (mois)" montant={Number(encaissementsMoisRows[0]?.total ?? 0)} />
            )}
            {peutDecaissements && (
              <StatTile label="Décaissements (mois)" montant={Number(decaissementsMoisRows[0]?.total ?? 0)} />
            )}
          </div>
        </section>
      )}

      {afficheAdmin && (
        <section className="space-y-4">
          <SectionTitle>Administration</SectionTitle>
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex flex-wrap gap-3">
              {peutUtilisateurs && (
                <Button variant="outline" render={<Link href="/utilisateurs" />}>
                  Gérer les utilisateurs
                </Button>
              )}
              {peutJournal && (
                <Button variant="outline" render={<Link href="/journal" />}>
                  Consulter le journal d&apos;activité
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
