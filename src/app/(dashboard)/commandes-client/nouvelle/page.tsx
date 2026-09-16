import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { Stack, Text, Title } from "@mantine/core";
import { CommandeClientForm } from "@/components/commandes/commande-client-form";

export default async function PageNouvelleCommandeClient() {
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

  const catalogue = listeArticles.map((a) => ({
    id: a.id,
    code: a.code,
    designation: a.designation,
    prix: a.prixVente,
  }));

  return (
    <Stack gap="xl" maw={1024}>
      <div>
        <Title order={1} size="h2">Nouvelle vente</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Sélectionnez le client, ajoutez les articles puis validez pour créer la commande.
        </Text>
      </div>
      <CommandeClientForm clients={listeClients} articles={catalogue} />
    </Stack>
  );
}
