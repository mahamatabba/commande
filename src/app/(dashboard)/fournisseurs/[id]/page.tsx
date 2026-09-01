import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, fournisseurs } from "@/db/schema";
import { can } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import { Button } from "@/components/ui/button";
import { modifierFournisseur } from "../actions";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export default async function PageFournisseur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fournisseurId = Number(id);
  const session = await auth();
  const peutEcrire = can(session, "referentiels:write");
  const peutVoirDecaissements = can(session, "decaissements:read");

  const [fournisseur] = await db
    .select()
    .from(fournisseurs)
    .where(eq(fournisseurs.id, fournisseurId))
    .limit(1);

  if (!fournisseur) notFound();

  const commandes = await db
    .select()
    .from(commandesFournisseur)
    .where(eq(commandesFournisseur.fournisseurId, fournisseurId))
    .orderBy(desc(commandesFournisseur.dateCommande));

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{fournisseur.nom}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            <span>{fournisseur.telephone}</span>
            {fournisseur.email && <span>· {fournisseur.email}</span>}
            {fournisseur.nif && <Badge variant="secondary">NIF {fournisseur.nif}</Badge>}
            <Badge variant={fournisseur.actif ? "default" : "outline"}>
              {fournisseur.actif ? "Actif" : "Inactif"}
            </Badge>
          </div>
          {fournisseur.adresse && <p className="mt-1 text-sm text-zinc-500">{fournisseur.adresse}</p>}
        </div>
        {peutEcrire && (
          <FournisseurFormDialog
            action={modifierFournisseur.bind(null, fournisseur.id)}
            fournisseur={fournisseur}
            trigger={<Button variant="outline">Modifier</Button>}
          />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Commandes</h2>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                {peutVoirDecaissements && <TableHead className="text-right">Réglé</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/commandes-fournisseur/${c.id}`} className="font-medium hover:underline">
                      {c.numero}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(c.dateCommande)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{STATUT_LABEL[c.statut]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatMontant(c.montantTotal)}</TableCell>
                  {peutVoirDecaissements && (
                    <TableCell className="text-right">{formatMontant(c.montantRegle)}</TableCell>
                  )}
                </TableRow>
              ))}
              {commandes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={peutVoirDecaissements ? 5 : 4} className="py-6 text-center text-zinc-500">
                    Aucune commande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {peutVoirDecaissements && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Paiements (décaissements)</h2>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Moyen</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiementsFournisseur.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.dateReglement)}</TableCell>
                    <TableCell>{p.moyen}</TableCell>
                    <TableCell className="text-right">{formatMontant(p.montant)}</TableCell>
                  </TableRow>
                ))}
                {paiementsFournisseur.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-zinc-500">
                      Aucun paiement.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
