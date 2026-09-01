import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
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
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Nouvelle commande fournisseur</h1>
      <CommandeFournisseurForm fournisseurs={listeFournisseurs} articles={catalogue} />
    </div>
  );
}
