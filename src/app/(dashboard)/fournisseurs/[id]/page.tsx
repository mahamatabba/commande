import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, fournisseurs } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { Badge, Button, Group, Stack, Text, Title, ThemeIcon, Paper } from "@mantine/core";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { modifierFournisseur } from "../actions";
import { FournisseurDetailTables } from "./fournisseur-detail-tables";
import { Building2 } from "lucide-react";
import { LienRetour } from "@/components/shared/lien-retour";

export default async function PageFournisseur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fournisseurId = Number(id);
  const session = await auth();
  requirePermission(session, "referentiels:read");
  const peutEcrire = can(session, "referentiels:write");
  const peutVoirDecaissements = can(session, "decaissements:read");

  // La fiche et ses achats ne dépendent pas l'un de l'autre : on les lit
  // ensemble plutôt qu'à la suite. Les règlements, eux, ont besoin des
  // identifiants de commande — cette lecture-là reste séquentielle.
  const [fournisseur, commandes] = await Promise.all([
    db
      .select()
      .from(fournisseurs)
      .where(eq(fournisseurs.id, fournisseurId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select()
      .from(commandesFournisseur)
      .where(eq(commandesFournisseur.fournisseurId, fournisseurId))
      .orderBy(desc(commandesFournisseur.dateCommande)),
  ]);

  if (!fournisseur) notFound();

  // Règlements liés aux commandes de ce fournisseur (jointure applicative,
  // le nombre de commandes par fournisseur reste faible).
  const idsCommandes = commandes.map((c) => c.id);
  const paiementsFournisseur =
    peutVoirDecaissements && idsCommandes.length > 0
      ? await db.query.reglements.findMany({
          where: (r, { inArray }) => inArray(r.commandeFournisseurId, idsCommandes),
          orderBy: (r, { desc }) => desc(r.dateReglement),
        })
      : [];

  return (
    <Stack gap="xl">
      <LienRetour href="/fournisseurs" libelle="Fournisseurs" />
      <Paper withBorder radius="lg" p="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <ThemeIcon size={52} radius="lg" variant="light" color="aei" visibleFrom="xs">
              <Building2 size={26} strokeWidth={1.8} />
            </ThemeIcon>
            <div>
              <Title order={1} size="h2" fw={800}>{fournisseur.nom}</Title>
              <Group gap="xs" mt={4} wrap="wrap">
                <Text size="sm" c="dimmed" className="font-mono tabular-nums">{fournisseur.telephone}</Text>
                {fournisseur.email && <Text size="sm" c="dimmed">· {fournisseur.email}</Text>}
                {fournisseur.nif && (
                  <Badge color="gray" variant="light" className="font-mono tabular-nums">
                    NIF {fournisseur.nif}
                  </Badge>
                )}
                <Badge color={fournisseur.actif ? "green" : "gray"} variant="light">
                  {fournisseur.actif ? "Actif" : "Inactif"}
                </Badge>
              </Group>
              {fournisseur.adresse && (
                <Text size="sm" c="dimmed" mt={4}>{fournisseur.adresse}</Text>
              )}
            </div>
          </Group>
          {peutEcrire && (
            <FournisseurFormDialog
              action={modifierFournisseur.bind(null, fournisseur.id)}
              fournisseur={fournisseur}
              trigger={<Button variant="outline">Modifier</Button>}
            />
          )}
        </Group>
      </Paper>

      <FournisseurDetailTables
        commandes={commandes}
        paiementsFournisseur={paiementsFournisseur}
        peutVoirDecaissements={peutVoirDecaissements}
      />
    </Stack>
  );
}
