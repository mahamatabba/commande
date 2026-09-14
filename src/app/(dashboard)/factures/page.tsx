import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, factures } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { STATUTS_FACTURE, bornerDebut, bornerFin, lireStatut } from "@/lib/filtres";
import { STATUT_FACTURE_CLASS } from "@/lib/statut-style";
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
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { Eye, FileText } from "lucide-react";

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
  requirePermission(session, "factures:read");
  // Le superviseur voit le chiffre d'affaires (montants) mais jamais le détail
  // des impayés/créances : cette colonne n'est donc même pas sélectionnée en
  // base pour lui, conformément à la règle "filtrer à la source".
  const peutVoirImpayes = can(session, "impayes:read");
  const { statut, du, au } = await searchParams;

  // Les filtres viennent de l'URL : un statut inconnu ou une date mal formée
  // sont écartés au lieu d'être transmis tels quels à PostgreSQL.
  const statutFiltre = lireStatut(statut, STATUTS_FACTURE);
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    statutFiltre ? eq(factures.statut, statutFiltre) : undefined,
    debut ? gte(factures.dateFacture, debut) : undefined,
    fin ? lte(factures.dateFacture, fin) : undefined,
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
            <Select name="statut" defaultValue={statutFiltre}>
              <SelectTrigger id="statut" className="w-48">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_FACTURE.map((s) => (
                  <SelectItem key={s} value={s}>
                    {libelle(STATUT_FACTURE_LABEL, s)}
                  </SelectItem>
                ))}
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

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              {peutVoirImpayes && <TableHead>Statut</TableHead>}
              <TableHead className="text-right">Montant</TableHead>
              {peutVoirImpayes && <TableHead className="text-right">Reste à payer</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Link href={`/factures/${f.id}`} className="font-mono tabular-nums font-medium hover:underline">
                    {f.numero}
                  </Link>
                </TableCell>
                <TableCell>{nomAffiche({ nom: f.clientNom, prenom: f.clientPrenom, raisonSociale: f.clientRaisonSociale })}</TableCell>
                <TableCell className="font-mono tabular-nums">{formatDate(f.dateFacture)}</TableCell>
                {peutVoirImpayes && (
                  <TableCell>
                    <Badge variant="outline" className={STATUT_FACTURE_CLASS[f.statut!]}>
                      {libelle(STATUT_FACTURE_LABEL, f.statut)}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-right font-mono tabular-nums">{formatMontant(f.montantTotal)}</TableCell>
                {peutVoirImpayes && (
                  <TableCell className="text-right font-mono tabular-nums">{formatMontant(f.resteAPayer!)}</TableCell>
                )}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Voir le détail"
                      render={<Link href={`/factures/${f.id}`} />}
                    >
                      <Eye />
                      <span className="sr-only">Voir le détail</span>
                    </Button>
                    <ApercuDocumentDialog
                      href={`/factures/${f.id}/imprimer`}
                      titre={`Facture ${f.numero}`}
                      nomFichier={`facture-${f.numero}`}
                      trigger={
                        <Button variant="ghost" size="icon-sm" title="Aperçu PDF">
                          <FileText />
                          <span className="sr-only">Aperçu PDF</span>
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {liste.length === 0 && (
              <TableRow>
                <TableCell colSpan={peutVoirImpayes ? 7 : 5} className="py-8 text-center text-muted-foreground">
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
