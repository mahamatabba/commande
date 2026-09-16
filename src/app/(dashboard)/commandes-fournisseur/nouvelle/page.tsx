import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { Stack, Text, Title } from "@mantine/core";
import { CommandeFournisseurForm } from "@/components/commandes/commande-fournisseur-form";

export default async function PageNouvelleCommandeFournisseur() {
  const session = await auth();
  requirePermission(session, "commandes_fournisseur:write");

  const [listeFournisseurs, listeArticles] = await Promise.all([
    db.query.fournisseurs.findMany({
      where: (f, { eq }) => eq(f.actif, true),
      orderBy: (f, { asc }) => asc(f.nom),
      columns: { id: true, nom: true },
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
    prix: a.prixAchatIndicatif,
  }));

  return (
    <Stack gap="xl" maw={1024}>
      <div>
        <Title order={1} size="h2">Nouvel achat</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Sélectionnez le fournisseur, ajoutez les articles puis validez pour créer la commande.
        </Text>
      </div>
      <CommandeFournisseurForm fournisseurs={listeFournisseurs} articles={catalogue} />
    </Stack>
  );
}
