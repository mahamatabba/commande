import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { Stack, Text, Title, ThemeIcon, Group } from "@mantine/core";
import { CommandeFournisseurForm } from "@/components/commandes/commande-fournisseur-form";
import { ShoppingCart } from "lucide-react";
import { LienRetour } from "@/components/shared/lien-retour";

export default async function PageNouvelleCommandeFournisseur({
  searchParams,
}: {
  searchParams: Promise<{ depuis?: string }>;
}) {
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

  // « Dupliquer » : le bon de commande d'origine sert de modèle.
  const { depuis } = await searchParams;
  const idModele = Number(depuis);
  const origine =
    Number.isInteger(idModele) && idModele > 0
      ? await db.query.commandesFournisseur.findFirst({
          where: (c, { eq }) => eq(c.id, idModele),
          with: { lignes: true },
        })
      : undefined;
  const modele = origine
    ? {
        fournisseurId: origine.fournisseurId,
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
    prix: a.prixAchatIndicatif,
  }));

  return (
    <Stack gap="xl" maw={1320}>
      <LienRetour href="/commandes-fournisseur" libelle="Bons de commande" />
      <div>
        <Group gap="md" wrap="nowrap">
          <ThemeIcon size={52} radius="lg" variant="light" color="aei" visibleFrom="xs">
            <ShoppingCart size={26} strokeWidth={1.8} />
          </ThemeIcon>
          <Title order={1} size="h2" fw={800}>{origine ? `Copie du bon de commande ${origine.numero}` : "Nouveau bon de commande fournisseur"}</Title>
        </Group>
        <Text size="sm" c="dimmed" mt={4} ml={{ base: 0, xs: 68 }}>
          Sélectionnez le fournisseur, ajoutez les articles puis validez pour créer la commande.
        </Text>
      </div>
      <CommandeFournisseurForm fournisseurs={listeFournisseurs} articles={catalogue} modele={modele} />
    </Stack>
  );
}
