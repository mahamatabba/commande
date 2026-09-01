import Link from "next/link";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, commandesClient } from "@/db/schema";
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
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

const MODE_LABEL: Record<string, string> = {
  ESPECES: "Espèces",
  BON_DE_COMMANDE: "Bon de commande",
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageCommandesClient({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string }>;
}) {
  const session = await auth();
  const peutEcrire = can(session, "commandes_client:write");
  const { statut, du, au } = await searchParams;

  const conditions = [
    statut ? eq(commandesClient.statut, statut as "BROUILLON") : undefined,
    du ? gte(commandesClient.dateCommande, new Date(du)) : undefined,
    au ? lte(commandesClient.dateCommande, new Date(au)) : undefined,
  ].filter(Boolean);

  const commandes = await db
    .select({
      id: commandesClient.id,
      numero: commandesClient.numero,
      dateCommande: commandesClient.dateCommande,
      statut: commandesClient.statut,
      modeReglement: commandesClient.modeReglement,
      montantTotal: commandesClient.montantTotal,
      clientNom: clients.nom,
      clientPrenom: clients.prenom,
      clientRaisonSociale: clients.raisonSociale,
    })
    .from(commandesClient)
    .innerJoin(clients, eq(commandesClient.clientId, clients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(commandesClient.dateCommande));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Commandes client</h1>
        {peutEcrire && (
          <Button render={<Link href="/commandes-client/nouvelle" />}>
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
              <SelectItem value="FACTUREE">Facturée</SelectItem>
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
          <Button variant="ghost" render={<Link href="/commandes-client" />}>
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
              <TableHead>Mode</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commandes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/commandes-client/${c.id}`} className="font-medium hover:underline">
                    {c.numero}
                  </Link>
                </TableCell>
                <TableCell>{nomAffiche({ nom: c.clientNom, prenom: c.clientPrenom, raisonSociale: c.clientRaisonSociale })}</TableCell>
                <TableCell>{formatDate(c.dateCommande)}</TableCell>
                <TableCell>{MODE_LABEL[c.modeReglement]}</TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUT_LABEL[c.statut]}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatMontant(c.montantTotal)}</TableCell>
              </TableRow>
            ))}
            {commandes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-zinc-500">
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
