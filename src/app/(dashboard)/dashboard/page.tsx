import Link from "next/link";
import { eq, inArray, ne, gte, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  commandesFournisseur,
  commandesClient,
  factures,
  mouvementsCaisse,
  proformas,
} from "@/db/schema";
import { can } from "@/lib/permissions";
import { calculerSoldeCaisse } from "@/lib/caisse";
import { CHART_COLORS } from "@/lib/constants";
import { cleMois, debutPeriode, derniersMois, libelleMois } from "@/lib/stats";
import { Button, Card, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { StatTile } from "@/components/statistiques/stat-tile";
import { EvolutionChart } from "@/components/statistiques/evolution-chart";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Title order={2} size="h4">{children}</Title>;
}

const NB_MOIS_GRAPHIQUE = 6;

/** Fenêtre sur laquelle le taux de transformation des proformas est calculé. */
const NB_MOIS_CONVERSION = 6;

function serieMensuelle(lignes: { mois: string; total: string }[]): { cle: string; label: string; valeur: number }[] {
  const parCle = new Map(lignes.map((l) => [cleMois(l.mois), Number(l.total)]));
  return derniersMois(NB_MOIS_GRAPHIQUE).map((cle) => ({ cle, label: libelleMois(cle), valeur: parCle.get(cle) ?? 0 }));
}

function CountTile({ label, valeur, href, note }: { label: string; valeur: number; href: string; note?: string }) {
  return (
    <Card component={Link} href={href} withBorder radius="md" className="transition-colors hover:border-[var(--mantine-color-brand-6)]">
      <Stack gap={4}>
        <Text size="sm" c="dimmed">{label}</Text>
        <Text size="xl" fw={600} className="font-mono tabular-nums">{valeur}</Text>
        {note && <Text size="xs" c="dimmed">{note}</Text>}
      </Stack>
    </Card>
  );
}

export default async function PageTableauDeBord() {
  const session = await auth();
  const debutMois = debutPeriode(1);
  const debutGraphique = debutPeriode(NB_MOIS_GRAPHIQUE);
  const debutConversion = debutPeriode(NB_MOIS_CONVERSION);

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
    proformasEnCoursRows,
    conversionRows,
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
    // Offres encore en circulation, et parmi elles celles dont la date de
    // validité est passée : une proforma expirée annonce un prix qui n'engage
    // plus AEI, c'est elle qu'il faut relancer ou ré-émettre.
    peutFactures
      ? db
          .select({
            n: sql<string>`count(*)`,
            expirees: sql<string>`count(*) FILTER (WHERE ${proformas.dateValidite} < now())`,
          })
          .from(proformas)
          .where(eq(proformas.statut, "EMISE"))
      : Promise.resolve([{ n: "0", expirees: "0" }]),
    // Taux de transformation : on ne compte au dénominateur que les offres
    // dont le sort est joué — converties, annulées, ou expirées sans réponse.
    // Une proforma remise hier et encore valable n'a pas eu sa chance : la
    // faire entrer dans le calcul ferait chuter le taux sans rien signifier.
    peutFactures
      ? db
          .select({
            decidees: sql<string>`count(*) FILTER (WHERE ${proformas.statut} <> 'EMISE' OR ${proformas.dateValidite} < now())`,
            converties: sql<string>`count(*) FILTER (WHERE ${proformas.statut} = 'CONVERTIE')`,
          })
          .from(proformas)
          .where(gte(proformas.dateProforma, debutConversion))
      : Promise.resolve([{ decidees: "0", converties: "0" }]),
  ]);

  const achatsSerie = serieMensuelle(achatsParMois);
  const ventesSerie = serieMensuelle(ventesParMois);

  const proformasExpirees = Number(proformasEnCoursRows[0]?.expirees ?? 0);
  const proformasDecidees = Number(conversionRows[0]?.decidees ?? 0);
  const proformasConverties = Number(conversionRows[0]?.converties ?? 0);
  const tauxConversion =
    proformasDecidees > 0 ? Math.round((proformasConverties / proformasDecidees) * 100) : null;

  // Le taux reste masqué tant qu'aucune offre n'a été tranchée : afficher
  // « 0 % » faute de données laisserait croire qu'aucun devis n'aboutit.
  const noteProformas =
    [
      proformasExpirees > 0
        ? `${proformasExpirees} expirée${proformasExpirees > 1 ? "s" : ""}`
        : null,
      tauxConversion !== null
        ? `${tauxConversion} % converties sur ${NB_MOIS_CONVERSION} mois`
        : null,
    ]
      .filter((part): part is string => part !== null)
      .join(" · ") || "Offres remises, en attente de réponse";

  return (
    <Stack gap="xl">
      <div>
        <Title order={1} size="h2">Tableau de bord</Title>
        <Text c="dimmed">
          Connecté en tant que <Text component="strong" c="var(--mantine-color-text)">{session!.user.name}</Text> — rôle{" "}
          <Text component="strong" c="var(--mantine-color-text)">{session!.user.role}</Text>.
        </Text>
      </div>

      {afficheActivite && (
        <Stack gap="md">
          <SectionTitle>Activité en cours</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
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
                label="Proformas en cours"
                valeur={Number(proformasEnCoursRows[0]?.n ?? 0)}
                href="/proformas"
                note={noteProformas}
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
          </SimpleGrid>
        </Stack>
      )}

      {afficheStats && (
        <Stack gap="md">
          <SectionTitle>Ce mois-ci</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {peutStatsAchats && (
              <StatTile label="Achats fournisseurs" montant={Number(achatsMoisRows[0]?.total ?? 0)} />
            )}
            {peutStatsVentes && (
              <StatTile label="Ventes facturées" montant={Number(ventesMoisRows[0]?.total ?? 0)} />
            )}
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            {peutStatsAchats && (
              <Card withBorder radius="md">
                <Title order={3} size="h5" mb="sm">
                  Évolution des achats ({NB_MOIS_GRAPHIQUE} derniers mois)
                </Title>
                <EvolutionChart data={achatsSerie} couleur={CHART_COLORS.bleu} libelleSerie="Achats" />
              </Card>
            )}
            {peutStatsVentes && (
              <Card withBorder radius="md">
                <Title order={3} size="h5" mb="sm">
                  Évolution des ventes ({NB_MOIS_GRAPHIQUE} derniers mois)
                </Title>
                <EvolutionChart data={ventesSerie} couleur={CHART_COLORS.orange} libelleSerie="Ventes" />
              </Card>
            )}
          </SimpleGrid>
          <Text size="sm" fw={500} component={Link} href="/statistiques" className="hover:underline" c="brand">
            Voir les statistiques détaillées →
          </Text>
        </Stack>
      )}

      {afficheCaisse && (
        <Stack gap="md">
          <SectionTitle>Caisse</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
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
          </SimpleGrid>
        </Stack>
      )}

      {afficheAdmin && (
        <Stack gap="md">
          <SectionTitle>Administration</SectionTitle>
          <Paper withBorder radius="md" p="md" style={{ backgroundColor: "var(--mantine-color-dark-6)" }}>
            <Group gap="sm" wrap="wrap">
              {peutUtilisateurs && (
                <Button variant="outline" component={Link} href="/utilisateurs">
                  Gérer les utilisateurs
                </Button>
              )}
              {peutJournal && (
                <Button variant="outline" component={Link} href="/journal">
                  Consulter le journal d&apos;activité
                </Button>
              )}
            </Group>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}
