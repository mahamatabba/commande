import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, proformas } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_PROFORMA_LABEL, libelle } from "@/lib/libelles";
import {
  STATUTS_PROFORMA,
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { STATUT_PROFORMA_CLASS } from "@/lib/statut-style";
import { PaginationListe } from "@/components/shared/pagination-liste";
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

/** Nombre de proformas affichées par page. */
const PAR_PAGE = 50;

export default async function PageProformas({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "factures:read");
  const params = await searchParams;
  const { statut, du, au } = params;
  const pageDemandee = lirePage(params.page);

  const statutFiltre = lireStatut(statut, STATUTS_PROFORMA);
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    statutFiltre ? eq(proformas.statut, statutFiltre) : undefined,
    debut ? gte(proformas.dateProforma, debut) : undefined,
    fin ? lte(proformas.dateProforma, fin) : undefined,
  ].filter(Boolean);
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  const [comptes, liste] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(proformas)
      .innerJoin(clients, eq(proformas.clientId, clients.id))
      .where(filtre),
    db
      .select({
        id: proformas.id,
        numero: proformas.numero,
        dateProforma: proformas.dateProforma,
        dateValidite: proformas.dateValidite,
        montantTotal: proformas.montantTotal,
        statut: proformas.statut,
        clientNom: clients.nom,
        clientPrenom: clients.prenom,
        clientRaisonSociale: clients.raisonSociale,
      })
      .from(proformas)
      .innerJoin(clients, eq(proformas.clientId, clients.id))
      .where(filtre)
      // L'`id` départage deux proformas du même jour, sinon l'ordre peut
      // changer d'une page à l'autre et une ligne se répète ou disparaît.
      .orderBy(desc(proformas.dateProforma), desc(proformas.id))
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/proformas", params, pageCourante));
  }

  const aujourdHui = new Date();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Proformas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chiffrages remis aux clients avant facturation. Une proforma n&apos;entre ni dans le
          chiffre d&apos;affaires, ni dans les impayés, ni en caisse.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="statut">Statut</Label>
          <Select name="statut" defaultValue={statutFiltre}>
            <SelectTrigger id="statut" className="w-48">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              {STATUTS_PROFORMA.map((s) => (
                <SelectItem key={s} value={s}>
                  {libelle(STATUT_PROFORMA_LABEL, s)}
                </SelectItem>
              ))}
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
          <Button variant="ghost" render={<Link href="/proformas" />}>
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
              <TableHead>Valable jusqu&apos;au</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant TTC</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((p) => {
              // Une offre dont la date est passée reste « émise » en base : le
              // statut dit où en est le document, la mention dit si le prix
              // engage encore AEI. Ce sont deux informations différentes.
              const expiree = p.statut === "EMISE" && p.dateValidite < aujourdHui;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/proformas/${p.id}`}
                      className="font-mono font-medium tabular-nums hover:underline"
                    >
                      {p.numero}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {nomAffiche({
                      nom: p.clientNom,
                      prenom: p.clientPrenom,
                      raisonSociale: p.clientRaisonSociale,
                    })}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{formatDate(p.dateProforma)}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    <span className={expiree ? "text-[#8A211C]" : undefined}>
                      {formatDate(p.dateValidite)}
                    </span>
                    {expiree && <span className="ml-2 text-xs text-[#8A211C]">expirée</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUT_PROFORMA_CLASS[p.statut]}>
                      {libelle(STATUT_PROFORMA_LABEL, p.statut)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatMontant(p.montantTotal)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Voir le détail"
                        render={<Link href={`/proformas/${p.id}`} />}
                      >
                        <Eye />
                        <span className="sr-only">Voir le détail</span>
                      </Button>
                      <ApercuDocumentDialog
                        href={`/proformas/${p.id}/pdf`}
                        titre={`Proforma ${p.numero}`}
                        nomFichier={`proforma-${p.numero}`}
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
              );
            })}
            {liste.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Aucune proforma. Elles s&apos;établissent depuis la fiche d&apos;une vente validée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationListe
        base="/proformas"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="proforma"
      />
    </div>
  );
}
