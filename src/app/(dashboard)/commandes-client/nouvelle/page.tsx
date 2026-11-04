import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { Stack, Text, Title, ThemeIcon, Group } from "@mantine/core";
import { CommandeClientForm } from "@/components/commandes/commande-client-form";
import { ShoppingBag } from "lucide-react";
import { LienRetour } from "@/components/shared/lien-retour";

export default async function PageNouvelleCommandeClient({
  searchParams,
}: {
  searchParams: Promise<{ depuis?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "commandes_client:write");

  const [listeClients, listeArticles] = await Promise.all([
    db.query.clients.findMany({
      where: (c, { eq }) => eq(c.actif, true),
      orderBy: (c, { asc }) => asc(c.nom),
      columns: { id: true, nom: true, prenom: true, raisonSociale: true },
    }),
    db.query.articles.findMany({
      where: (a, { eq }) => eq(a.actif, true),
      orderBy: (a, { asc }) => asc(a.designation),
    }),
  ]);

  // « Dupliquer » : la vente d'origine sert de modèle (client, mode de
  // règlement, lignes au prix d'alors) ; la date, elle, repart d'aujourd'hui.
  const { depuis } = await searchParams;
  const idModele = Number(depuis);
  const origine =
    Number.isInteger(idModele) && idModele > 0
      ? await db.query.commandesClient.findFirst({
          where: (c, { eq }) => eq(c.id, idModele),
          with: { lignes: true },
        })
      : undefined;
  const modele = origine
    ? {
        clientId: origine.clientId,
        modeReglement: origine.modeReglement,
        lignes: origine.lignes.map((l) => ({
          articleId: l.articleId,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
      }
    : undefined;

  const catalogue = listeArticles.map((a) => ({
    id: a.id,
    code: a.code,
    designation: a.designation,
    prix: a.prixVente,
  }));

  return (
    <Stack gap="xl" maw={1320}>
      <LienRetour href="/commandes-client" libelle="Ventes" />
      <div>
        <Group gap="md" wrap="nowrap">
          <ThemeIcon size={52} radius="lg" variant="light" color="brand" visibleFrom="xs">
            <ShoppingBag size={26} strokeWidth={1.8} />
          </ThemeIcon>
          <Title order={1} size="h2" fw={800}>{origine ? `Copie de la vente ${origine.numero}` : "Nouvelle vente"}</Title>
        </Group>
        <Text size="sm" c="dimmed" mt={4} ml={{ base: 0, xs: 68 }}>
          Sélectionnez le client, ajoutez les articles puis validez pour créer la commande.
        </Text>
      </div>
      <CommandeClientForm clients={listeClients} articles={catalogue} modele={modele} />
    </Stack>
  );
}
