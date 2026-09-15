import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, factures } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import {
  STATUTS_FACTURE,
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { STATUT_FACTURE_BADGE } from "@/lib/statut-style";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { Badge } from "@mantine/core";
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

/** Nombre de factures affichées par page. */
const PAR_PAGE = 50;

export default async function PageFactures({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "factures:read");
  // Le superviseur voit le chiffre d'affaires (montants) mais jamais le détail
  // des impayés/créances : cette colonne n'est donc même pas sélectionnée en
  // base pour lui, conformément à la règle "filtrer à la source".
  const peutVoirImpayes = can(session, "impayes:read");
  const params = await searchParams;
  const { statut, du, au } = params;
  const pageDemandee = lirePage(params.page);

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
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  // Comptage et page de résultats sont indépendants : lancés ensemble, ils ne
  // coûtent qu'un aller-retour au lieu de deux. Compter en base plutôt que
  // `liste.length` est la raison d'être de la pagination : on ne rapatrie plus
  // l'intégralité du fichier des ventes pour afficher vingt lignes.
  const [comptes, liste] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(factures)
      .innerJoin(clients, eq(factures.clientId, clients.id))
      .where(filtre),
    db
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
      .where(filtre)
      // L'`id` départage deux factures du même jour : sans lui, PostgreSQL est
      // libre de renvoyer les lignes dans un ordre différent d'une page à
      // l'autre, et la même facture apparaît deux fois ou disparaît.
      .orderBy(desc(factures.dateFacture), desc(factures.id))
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  // Page au-delà de la dernière (filtre resserré depuis la page 4, favori
  // périmé) : on renvoie sur la dernière page réelle plutôt que d'afficher un
  // « aucune facture » trompeur alors que la liste en contient.
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/factures", params, pageCourante));
  }

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
                    <Badge {...STATUT_FACTURE_BADGE[f.statut!]}>
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
                      href={`/factures/${f.id}/pdf`}
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

      <PaginationListe
        base="/factures"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="facture"
      />
    </div>
  );
}
