import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, factures } from "@/db/schema";
import { can } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUT_LABEL: Record<string, string> = {
  NON_PAYEE: "Non payée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  SOLDEE: "Soldée",
  ANNULEE: "Annulée",
};

const STATUT_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  NON_PAYEE: "destructive",
  PARTIELLEMENT_PAYEE: "secondary",
  SOLDEE: "default",
  ANNULEE: "outline",
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageFactures({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string }>;
}) {
  const session = await auth();
  // Le superviseur voit le chiffre d'affaires (montants) mais jamais le détail
  // des impayés/créances : cette colonne n'est donc même pas sélectionnée en
  // base pour lui, conformément à la règle "filtrer à la source".
  const peutVoirImpayes = can(session, "impayes:read");
  const { statut, du, au } = await searchParams;

  const conditions = [
    statut ? eq(factures.statut, statut as "NON_PAYEE") : undefined,
    du ? gte(factures.dateFacture, new Date(du)) : undefined,
    au ? lte(factures.dateFacture, new Date(au)) : undefined,
  ].filter(Boolean);

  const liste = await db
    .select({
      id: factures.id,
      numero: factures.numero,
      dateFacture: factures.dateFacture,
      montantTotal: factures.montantTotal,
      statut: peutVoirImpayes ? factures.statut : sql<string | null>`NULL`,
      resteAPayer: peutVoirImpayes ? factures.resteAPayer : sql<number | null>`NULL`,
      clientNom: clients.nom,
      clientPrenom: clients.prenom,
      clientRaisonSociale: clients.raisonSociale,
    })
    .from(factures)
    .innerJoin(clients, eq(factures.clientId, clients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(factures.dateFacture));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Factures</h1>

      <form className="flex flex-wrap items-end gap-3">
        {peutVoirImpayes && (
          <div className="space-y-1">
            <Label htmlFor="statut">Statut</Label>
            <Select name="statut" defaultValue={statut}>
              <SelectTrigger id="statut" className="w-48">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NON_PAYEE">Non payée</SelectItem>
                <SelectItem value="PARTIELLEMENT_PAYEE">Partiellement payée</SelectItem>
                <SelectItem value="SOLDEE">Soldée</SelectItem>
                <SelectItem value="ANNULEE">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
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
          <Button variant="ghost" render={<Link href="/factures" />}>
            Réinitialiser
          </Button>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              {peutVoirImpayes && <TableHead>Statut</TableHead>}
              <TableHead className="text-right">Montant</TableHead>
              {peutVoirImpayes && <TableHead className="text-right">Reste à payer</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Link href={`/factures/${f.id}`} className="font-medium hover:underline">
                    {f.numero}
                  </Link>
                </TableCell>
                <TableCell>{nomAffiche({ nom: f.clientNom, prenom: f.clientPrenom, raisonSociale: f.clientRaisonSociale })}</TableCell>
                <TableCell>{formatDate(f.dateFacture)}</TableCell>
                {peutVoirImpayes && (
                  <TableCell>
                    <Badge variant={STATUT_VARIANT[f.statut!]}>{STATUT_LABEL[f.statut!]}</Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">{formatMontant(f.montantTotal)}</TableCell>
                {peutVoirImpayes && (
                  <TableCell className="text-right">{formatMontant(f.resteAPayer!)}</TableCell>
                )}
              </TableRow>
            ))}
            {liste.length === 0 && (
              <TableRow>
                <TableCell colSpan={peutVoirImpayes ? 6 : 4} className="py-8 text-center text-zinc-500">
                  Aucune facture.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
