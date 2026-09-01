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
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouvel achat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionnez le fournisseur, ajoutez les articles puis validez pour créer la commande.
        </p>
      </div>
      <CommandeFournisseurForm fournisseurs={listeFournisseurs} articles={catalogue} />
    </div>
  );
}
