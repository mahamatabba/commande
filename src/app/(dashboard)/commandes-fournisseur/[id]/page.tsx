import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { can } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnnulationDialog } from "@/components/shared/annulation-dialog";
import {
  annulerCommandeFournisseur,
  recevoirCommandeFournisseur,
  validerCommandeFournisseur,
} from "../actions";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export default async function PageCommandeFournisseur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commandeId = Number(id);
  const session = await auth();
  const peutEcrire = can(session, "commandes_fournisseur:write");
  const peutAnnuler = can(session, "annulation:effectuer");
  const peutVoirDecaissements = can(session, "decaissements:read");

  const commande = await db.query.commandesFournisseur.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: { fournisseur: true, lignes: true },
  });

  if (!commande) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{commande.numero}</h1>
            <Badge variant="outline">{STATUT_LABEL[commande.statut]}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            <Link href={`/fournisseurs/${commande.fournisseur.id}`} className="hover:underline">
              {commande.fournisseur.nom}
            </Link>{" "}
            · {formatDate(commande.dateCommande)}
          </p>
        </div>
        <div className="flex gap-2">
          {peutEcrire && commande.statut === "BROUILLON" && (
            <form action={validerCommandeFournisseur.bind(null, commande.id)}>
              <Button type="submit">Valider</Button>
            </form>
          )}
          {peutEcrire && commande.statut === "VALIDEE" && (
            <form action={recevoirCommandeFournisseur.bind(null, commande.id)}>
              <Button type="submit">Marquer reçue</Button>
            </form>
          )}
          {peutAnnuler && commande.statut !== "ANNULEE" && commande.statut !== "RECUE" && (
            <AnnulationDialog
              action={annulerCommandeFournisseur.bind(null, commande.id)}
              titre="Annuler la commande"
            />
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commande.lignes.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.designation}</TableCell>
                <TableCell className="text-right">{l.quantite}</TableCell>
                <TableCell className="text-right">{formatMontant(l.prixUnitaire)}</TableCell>
                <TableCell className="text-right">{formatMontant(l.montantLigne)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-8 border-t bg-zinc-50 p-3 text-sm">
          <span>
            Total : <strong>{formatMontant(commande.montantTotal)}</strong>
          </span>
          {peutVoirDecaissements && (
            <span>
              Réglé : <strong>{formatMontant(commande.montantRegle)}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
