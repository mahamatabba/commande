import Link from "next/link";
import { eq, inArray, ne, gte, lt, and, sql, desc, asc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  clients,
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
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { STATUT_FACTURE_BADGE } from "@/lib/statut-style";
import { Badge, Button, Card, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import {
  ArrowRight,
  CircleAlert,
  FileSignature,
  FileText,
  HandCoins,
  History,
  Plus,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UserCog,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EvolutionChart } from "@/components/statistiques/evolution-chart";

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Group justify="space-between" align="center">
      <Title order={2} size="h4">{children}</Title>
      {action}
    </Group>
  );
}

function nomClient(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

/** Variation en %, arrondie ; `null` quand la période de référence est vide. */
function variation(actuel: number, precedent: number): number | null {
  if (precedent <= 0) return null;
  return Math.round(((actuel - precedent) / precedent) * 100);
}

function salutation(): string {
  const heure = Number(
    new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Africa/Ndjamena" }).format(new Date()),
  );
  return heure < 18 ? "Bonjour" : "Bonsoir";
}

const NB_MOIS_GRAPHIQUE = 6;

/** Fenêtre sur laquelle le taux de transformation des proformas est calculé. */
const NB_MOIS_CONVERSION = 6;

function serieMensuelle(lignes: { mois: string; total: string }[]): { cle: string; label: string; valeur: number }[] {
  const parCle = new Map(lignes.map((l) => [cleMois(l.mois), Number(l.total)]));
  return derniersMois(NB_MOIS_GRAPHIQUE).map((cle) => ({ cle, label: libelleMois(cle), valeur: parCle.get(cle) ?? 0 }));
}


export default async function PageTableauDeBord() {
  const session = await auth();
  const debutMois = debutPeriode(1);
  const debutMoisPrecedent = debutPeriode(2);
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
    ventesMoisPrecedentRows,
    achatsMoisPrecedentRows,
    dernieresFactures,
    proformasARelancer,
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
    peutStatsVentes
      ? db
          .select({ total: sql<string>`COALESCE(SUM(${factures.montantTotal}), 0)` })
          .from(factures)
          .where(
            and(
              ne(factures.statut, "ANNULEE"),
              gte(factures.dateFacture, debutMoisPrecedent),
              lt(factures.dateFacture, debutMois),
            ),
          )
      : Promise.resolve([{ total: "0" }]),
    peutStatsAchats
      ? db
          .select({ total: sql<string>`COALESCE(SUM(${commandesFournisseur.montantTotal}), 0)` })
          .from(commandesFournisseur)
          .where(
            and(
              ne(commandesFournisseur.statut, "ANNULEE"),
              gte(commandesFournisseur.dateCommande, debutMoisPrecedent),
              lt(commandesFournisseur.dateCommande, debutMois),
            ),
          )
      : Promise.resolve([{ total: "0" }]),
    peutFactures
      ? db
          .select({
            id: factures.id,
            numero: factures.numero,
            dateFacture: factures.dateFacture,
            montantTotal: factures.montantTotal,
            statut: factures.statut,
            nom: clients.nom,
            prenom: clients.prenom,
            raisonSociale: clients.raisonSociale,
          })
          .from(factures)
          .innerJoin(clients, eq(clients.id, factures.clientId))
          .orderBy(desc(factures.dateFacture), desc(factures.id))
          .limit(6)
      : Promise.resolve([]),
    // Offres en circulation, de la plus proche de l'échéance à la plus
    // lointaine : ce sont les premières à relancer.
    peutFactures
      ? db
          .select({
            id: proformas.id,
            numero: proformas.numero,
            dateValidite: proformas.dateValidite,
            montantTotal: proformas.montantTotal,
            nom: clients.nom,
            prenom: clients.prenom,
            raisonSociale: clients.raisonSociale,
          })
          .from(proformas)
          .innerJoin(clients, eq(clients.id, proformas.clientId))
          .where(eq(proformas.statut, "EMISE"))
          .orderBy(asc(proformas.dateValidite))
          .limit(6)
      : Promise.resolve([]),
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

  const ventesMois = Number(ventesMoisRows[0]?.total ?? 0);
  const achatsMois = Number(achatsMoisRows[0]?.total ?? 0);
  const prenom = session!.user.name?.split(/\s+/)[0] ?? "";
  const aujourdhui = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Ndjamena",
  }).format(new Date());
  const maintenant = new Date();

  const peutCreerVente = can(session, "commandes_client:write");
  const peutCreerAchat = can(session, "commandes_fournisseur:write");
  const peutRegler = can(session, "reglements:saisir");

  return (
    <Stack gap="xl">
      <Paper
        radius="lg"
        p={{ base: "lg", md: "xl" }}
        withBorder
        style={{
          background:
            "linear-gradient(120deg, rgba(0,138,191,0.22) 0%, var(--aei-hero-milieu) 55%, rgba(250,167,85,0.16) 100%)",
        }}
      >
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <Text size="sm" c="dimmed" tt="capitalize">{aujourdhui}</Text>
            <Title order={1} size="h2" mt={4}>
              {salutation()}, {prenom}
            </Title>
            <Text c="dimmed" mt={4}>
              Voici l&apos;essentiel de l&apos;activité d&apos;AEI aujourd&apos;hui.
            </Text>
          </div>
          <Group gap="sm" wrap="wrap">
            {peutCreerVente && (
              <Button component={Link} href="/commandes-client/nouvelle" leftSection={<Plus size={16} />}>
                Nouvelle vente
              </Button>
            )}
            {peutCreerAchat && (
              <Button
                component={Link}
                href="/commandes-fournisseur/nouvelle"
                variant="default"
                leftSection={<ShoppingCart size={16} />}
              >
                Bon de commande
              </Button>
            )}
            {peutRegler && (
              <Button component={Link} href="/reglements" variant="default" leftSection={<HandCoins size={16} />}>
                Règlement
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      {(afficheStats || afficheCaisse) && (
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }}>
          {peutStatsVentes && (
            <KpiCard
              label="Ventes facturées (mois)"
              valeur={ventesMois}
              icone={TrendingUp}
              couleur="brand"
              evolution={variation(ventesMois, Number(ventesMoisPrecedentRows[0]?.total ?? 0))}
              note="vs mois précédent"
              href="/factures"
            />
          )}
          {peutStatsAchats && (
            <KpiCard
              label="Achats fournisseurs (mois)"
              valeur={achatsMois}
              icone={ShoppingCart}
              couleur="aei"
              evolution={variation(achatsMois, Number(achatsMoisPrecedentRows[0]?.total ?? 0))}
              note="vs mois précédent"
              href="/commandes-fournisseur"
            />
          )}
          {peutSoldeCaisse && (
            <KpiCard label="Solde de caisse" valeur={soldeCaisse} icone={Wallet} couleur="green" href="/caisse" note="Encaissements − décaissements" />
          )}
          {peutImpayes && (
            <KpiCard
              label="Total impayés"
              valeur={Number(totalImpayesRows[0]?.total ?? 0)}
              icone={CircleAlert}
              couleur="red"
              href="/factures"
              note={`${Number(facturesImpayees[0]?.n ?? 0)} facture(s) non soldée(s)`}
            />
          )}
        </SimpleGrid>
      )}

      {afficheActivite && (
        <Stack gap="md">
          <SectionTitle>Activité en cours</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            {peutCommandesFournisseur && (
              <KpiCard
                format="nombre"
                label="Bons de commande validés"
                valeur={Number(commandesFournisseurEnCours[0]?.n ?? 0)}
                icone={ShoppingCart}
                couleur="aei"
                href="/commandes-fournisseur"
                note="En attente de réception"
              />
            )}
            {peutCommandesClient && (
              <KpiCard
                format="nombre"
                label="Ventes à facturer"
                valeur={Number(commandesClientEnCours[0]?.n ?? 0)}
                icone={ShoppingBag}
                couleur="brand"
                href="/commandes-client"
                note="Validées, pas encore facturées"
              />
            )}
            {peutFactures && (
              <KpiCard
                format="nombre"
                label="Proformas en cours"
                valeur={Number(proformasEnCoursRows[0]?.n ?? 0)}
                icone={FileSignature}
                couleur="violet"
                href="/proformas"
                note={noteProformas}
              />
            )}
            {peutFactures && (
              <KpiCard
                format="nombre"
                label="Factures impayées"
                valeur={Number(facturesImpayees[0]?.n ?? 0)}
                icone={FileText}
                couleur="red"
                href="/factures"
                note="Non soldées ou partiellement réglées"
              />
            )}
          </SimpleGrid>
        </Stack>
      )}

      {afficheStats && (
        <SimpleGrid cols={{ base: 1, lg: 2 }}>
          {peutStatsVentes && (
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="sm">
                <Title order={3} size="h5">Ventes — {NB_MOIS_GRAPHIQUE} derniers mois</Title>
                <Badge variant="light" color="brand">TTC facturé</Badge>
              </Group>
              <EvolutionChart data={ventesSerie} couleur={CHART_COLORS.bleu} libelleSerie="Ventes" />
            </Card>
          )}
          {peutStatsAchats && (
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="sm">
                <Title order={3} size="h5">Achats — {NB_MOIS_GRAPHIQUE} derniers mois</Title>
                <Badge variant="light" color="aei">Hors annulés</Badge>
              </Group>
              <EvolutionChart data={achatsSerie} couleur={CHART_COLORS.orange} libelleSerie="Achats" />
            </Card>
          )}
        </SimpleGrid>
      )}

      {peutFactures && (
        <SimpleGrid cols={{ base: 1, lg: 2 }}>
          <Card withBorder radius="lg" padding="lg">
            <SectionTitle
              action={
                <Button component={Link} href="/factures" variant="subtle" size="xs" rightSection={<ArrowRight size={14} />}>
                  Toutes
                </Button>
              }
            >
              Dernières factures
            </SectionTitle>
            <Stack gap={0} mt="sm">
              {dernieresFactures.length === 0 && (
                <Text size="sm" c="dimmed" py="md">Aucune facture pour le moment.</Text>
              )}
              {dernieresFactures.map((f) => (
                <Group
                  key={f.id}
                  justify="space-between"
                  wrap="nowrap"
                  py="xs"
                  style={{ borderTop: "1px solid var(--aei-ligne)" }}
                >
                  <div className="min-w-0">
                    <Text size="sm" fw={600} component={Link} href={`/factures/${f.id}`} className="font-mono tabular-nums hover:underline">
                      {f.numero}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {nomClient(f)} · {formatDate(f.dateFacture)}
                    </Text>
                  </div>
                  <Group gap="sm" wrap="nowrap">
                    <Text size="sm" className="font-mono tabular-nums" fw={500}>
                      {formatMontant(f.montantTotal)}
                    </Text>
                    {peutImpayes && (
                      <Badge {...STATUT_FACTURE_BADGE[f.statut]} size="sm">
                        {libelle(STATUT_FACTURE_LABEL, f.statut)}
                      </Badge>
                    )}
                  </Group>
                </Group>
              ))}
            </Stack>
          </Card>

          <Card withBorder radius="lg" padding="lg">
            <SectionTitle
              action={
                <Button component={Link} href="/proformas" variant="subtle" size="xs" rightSection={<ArrowRight size={14} />}>
                  Toutes
                </Button>
              }
            >
              Proformas à suivre
            </SectionTitle>
            <Stack gap={0} mt="sm">
              {proformasARelancer.length === 0 && (
                <Text size="sm" c="dimmed" py="md">Aucune proforma en circulation.</Text>
              )}
              {proformasARelancer.map((p) => {
                const expiree = p.dateValidite < maintenant;
                const jours = Math.ceil((p.dateValidite.getTime() - maintenant.getTime()) / 86_400_000);
                return (
                  <Group
                    key={p.id}
                    justify="space-between"
                    wrap="nowrap"
                    py="xs"
                    style={{ borderTop: "1px solid var(--aei-ligne)" }}
                  >
                    <div className="min-w-0">
                      <Text size="sm" fw={600} component={Link} href={`/proformas/${p.id}`} className="font-mono tabular-nums hover:underline">
                        {p.numero}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {nomClient(p)}
                      </Text>
                    </div>
                    <Group gap="sm" wrap="nowrap">
                      <Text size="sm" className="font-mono tabular-nums" fw={500}>
                        {formatMontant(p.montantTotal)}
                      </Text>
                      <Badge size="sm" variant="light" color={expiree ? "red" : jours <= 7 ? "yellow" : "gray"}>
                        {expiree ? "Expirée" : jours <= 1 ? "Expire demain" : `${jours} j restants`}
                      </Badge>
                    </Group>
                  </Group>
                );
              })}
            </Stack>
          </Card>
        </SimpleGrid>
      )}

      {afficheCaisse && (peutEncaissements || peutDecaissements) && (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {peutEncaissements && (
            <KpiCard
              label="Encaissements du mois"
              valeur={Number(encaissementsMoisRows[0]?.total ?? 0)}
              icone={HandCoins}
              couleur="green"
              href="/caisse"
            />
          )}
          {peutDecaissements && (
            <KpiCard
              label="Décaissements du mois"
              valeur={Number(decaissementsMoisRows[0]?.total ?? 0)}
              icone={Wallet}
              couleur="orange"
              href="/caisse"
            />
          )}
        </SimpleGrid>
      )}

      {afficheStats && (
        <Text size="sm" fw={500} component={Link} href="/statistiques" className="hover:underline" c="brand.4">
          Voir les statistiques détaillées →
        </Text>
      )}

      {afficheAdmin && (
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap="sm">
              <ThemeIcon variant="light" color="gray" size={36} radius="md">
                <UserCog size={18} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm">Administration</Text>
                <Text size="xs" c="dimmed">Comptes utilisateurs et traçabilité.</Text>
              </div>
            </Group>
            <Group gap="sm" wrap="wrap">
              {peutUtilisateurs && (
                <Button variant="default" component={Link} href="/utilisateurs" leftSection={<UserCog size={16} />}>
                  Utilisateurs
                </Button>
              )}
              {peutJournal && (
                <Button variant="default" component={Link} href="/journal" leftSection={<History size={16} />}>
                  Journal d&apos;activité
                </Button>
              )}
            </Group>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
