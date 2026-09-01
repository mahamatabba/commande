import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, fournisseurs } from "@/db/schema";
import { can } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export default async function PageCommandesFournisseur({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string }>;
}) {
  const session = await auth();
  const peutEcrire = can(session, "commandes_fournisseur:write");
  const peutVoirDecaissements = can(session, "decaissements:read");
  const { statut, du, au } = await searchParams;

  const conditions = [
    statut ? eq(commandesFournisseur.statut, statut as "BROUILLON") : undefined,
    du ? gte(commandesFournisseur.dateCommande, new Date(du)) : undefined,
    au ? lte(commandesFournisseur.dateCommande, new Date(au)) : undefined,
  ].filter(Boolean);

  const commandes = await db
    .select({
      id: commandesFournisseur.id,
      numero: commandesFournisseur.numero,
      dateCommande: commandesFournisseur.dateCommande,
      statut: commandesFournisseur.statut,
      montantTotal: commandesFournisseur.montantTotal,
      montantRegle: peutVoirDecaissements ? commandesFournisseur.montantRegle : sql<number | null>`NULL`,
      fournisseurNom: fournisseurs.nom,
    })
    .from(commandesFournisseur)
    .innerJoin(fournisseurs, eq(commandesFournisseur.fournisseurId, fournisseurs.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(commandesFournisseur.dateCommande));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Commandes fournisseur</h1>
        {peutEcrire && (
          <Button render={<Link href="/commandes-fournisseur/nouvelle" />}>
            Nouvelle commande
          </Button>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="statut">Statut</Label>
          <Select name="statut" defaultValue={statut}>
            <SelectTrigger id="statut" className="w-40">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BROUILLON">Brouillon</SelectItem>
              <SelectItem value="VALIDEE">Validée</SelectItem>
              <SelectItem value="RECUE">Reçue</SelectItem>
              <SelectItem value="ANNULEE">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="du">Du</Label>
          <Input id="du" name="du" type="date" defaultValue={du} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="au">Au</Label>
          <Input id="au" name="au" type="date" defaultValue={au} />
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {(statut || du || au) && (
          <Button variant="ghost" render={<Link href="/commandes-fournisseur" />}>
            Réinitialiser
          </Button>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Fournisseur</TableHead>
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
                <TableCell>{c.fournisseurNom}</TableCell>
                <TableCell>{formatDate(c.dateCommande)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUT_LABEL[c.statut]}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatMontant(c.montantTotal)}</TableCell>
                {peutVoirDecaissements && (
                  <TableCell className="text-right">{formatMontant(c.montantRegle!)}</TableCell>
                )}
              </TableRow>
            ))}
            {commandes.length === 0 && (
              <TableRow>
                <TableCell colSpan={peutVoirDecaissements ? 6 : 5} className="py-8 text-center text-zinc-500">
                  Aucune commande.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
