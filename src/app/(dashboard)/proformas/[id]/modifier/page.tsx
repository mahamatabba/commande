import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { Alert, Button, Stack, Text, Title } from "@mantine/core";
import { ModifierProformaForm } from "@/components/proformas/modifier-proforma-form";
import { TAUX_TVA_STANDARD } from "@/lib/constants";

const JOUR_MS = 24 * 60 * 60 * 1000;

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageModifierProforma({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  requirePermission(session, "factures:emettre");

  const { id } = await params;
  const proformaId = Number(id);
  if (!Number.isInteger(proformaId) || proformaId <= 0) notFound();

  const proforma = await db.query.proformas.findFirst({
    where: (p, { eq }) => eq(p.id, proformaId),
    with: { client: true, commandeClient: { with: { lignes: true } } },
  });
  if (!proforma) notFound();

  if (proforma.statut !== "EMISE" || proforma.commandeClient.statut !== "VALIDEE") {
    return (
      <Stack gap="md" maw={640}>
        <Title order={1} size="h2">Modifier la proforma {proforma.numero}</Title>
        <Alert color="yellow" variant="light">
          Seule une proforma en circulation, sur une vente encore validée, peut être modifiée.
        </Alert>
        <Button variant="outline" component={Link} href={`/proformas/${proforma.id}`} w="fit-content">
          Retour à la proforma
        </Button>
      </Stack>
    );
  }

  const listeArticles = await db.query.articles.findMany({
    orderBy: (a, { asc }) => asc(a.designation),
  });
  const idsUtilises = new Set(proforma.commandeClient.lignes.map((l) => l.articleId));
  const catalogue = listeArticles
    .filter((a) => a.actif || idsUtilises.has(a.id))
    .map((a) => ({ id: a.id, code: a.code, designation: a.designation, prix: a.prixVente }));

  const validite = Math.max(
    1,
    Math.min(365, Math.round((proforma.dateValidite.getTime() - proforma.dateProforma.getTime()) / JOUR_MS)),
  );

  return (
    <Stack gap="xl" maw={1152}>
      <div>
        <Title order={1} size="h2">
          Modifier la proforma <span className="font-mono tabular-nums">{proforma.numero}</span>
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {nomAffiche(proforma.client)} · vente {proforma.commandeClient.numero}. Les lignes modifiées
          ici remplacent celles de la vente, qui n&apos;est pas encore facturée.
        </Text>
      </div>

      <ModifierProformaForm
        proformaId={proforma.id}
        articles={catalogue}
        lignesInitiales={proforma.commandeClient.lignes.map((l) => ({
          articleId: l.articleId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        }))}
        exonereInitial={proforma.exonereTva}
        tauxInitial={proforma.exonereTva ? TAUX_TVA_STANDARD : proforma.tauxTva}
        validiteInitiale={validite}
        delaiLivraison={proforma.delaiLivraison}
        garantie={proforma.garantie}
        dateProforma={proforma.dateProforma}
      />
    </Stack>
  );
}
