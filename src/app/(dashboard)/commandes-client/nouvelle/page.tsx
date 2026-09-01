import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
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
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Nouvelle commande client</h1>
      <CommandeClientForm clients={listeClients} articles={catalogue} />
    </div>
  );
}
