import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, commandesClient } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import {
  STATUTS_COMMANDE_CLIENT,
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { MODE_REGLEMENT_LABEL, STATUT_COMMANDE_CLIENT_LABEL, libelle } from "@/lib/libelles";
import { STATUT_COMMANDE_CLIENT_CLASS } from "@/lib/statut-style";
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
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { Eye, FileText } from "lucide-react";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

/** Nombre de ventes affichées par page. */
const PAR_PAGE = 50;

export default async function PageCommandesClient({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "commandes_client:read");
  const peutEcrire = can(session, "commandes_client:write");
  const params = await searchParams;
  const { statut, du, au } = params;
  const pageDemandee = lirePage(params.page);

  const statutFiltre = lireStatut(statut, STATUTS_COMMANDE_CLIENT);
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    statutFiltre ? eq(commandesClient.statut, statutFiltre) : undefined,
    debut ? gte(commandesClient.dateCommande, debut) : undefined,
    fin ? lte(commandesClient.dateCommande, fin) : undefined,
  ].filter(Boolean);
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  const [comptes, commandes] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(commandesClient)
      .innerJoin(clients, eq(commandesClient.clientId, clients.id))
      .where(filtre),
    db
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
      .where(filtre)
      // L'`id` départage deux ventes du même jour : sans lui, l'ordre peut
      // varier d'une page à l'autre et une ligne se répéter.
      .orderBy(desc(commandesClient.dateCommande), desc(commandesClient.id))
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/commandes-client", params, pageCourante));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ventes</h1>
        {peutEcrire && (
          <Button render={<Link href="/commandes-client/nouvelle" />}>
            Nouvelle vente
          </Button>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="statut">Statut</Label>
          <Select name="statut" defaultValue={statutFiltre}>
            <SelectTrigger id="statut" className="w-40">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              {STATUTS_COMMANDE_CLIENT.map((s) => (
                <SelectItem key={s} value={s}>
                  {libelle(STATUT_COMMANDE_CLIENT_LABEL, s)}
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
          <Button variant="ghost" render={<Link href="/commandes-client" />}>
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
              <TableHead>Mode</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {commandes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/commandes-client/${c.id}`} className="font-mono tabular-nums font-medium hover:underline">
                    {c.numero}
                  </Link>
                </TableCell>
                <TableCell>{nomAffiche({ nom: c.clientNom, prenom: c.clientPrenom, raisonSociale: c.clientRaisonSociale })}</TableCell>
                <TableCell className="font-mono tabular-nums">{formatDate(c.dateCommande)}</TableCell>
                <TableCell>{libelle(MODE_REGLEMENT_LABEL, c.modeReglement)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUT_COMMANDE_CLIENT_CLASS[c.statut]}>
                    {libelle(STATUT_COMMANDE_CLIENT_LABEL, c.statut)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMontant(c.montantTotal)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Voir le détail"
                      render={<Link href={`/commandes-client/${c.id}`} />}
                    >
                      <Eye />
                      <span className="sr-only">Voir le détail</span>
                    </Button>
                    <ApercuDocumentDialog
                      href={`/commandes-client/${c.id}/pdf`}
                      titre={`Bon de commande ${c.numero}`}
                      nomFichier={`bon-commande-${c.numero}`}
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
            {commandes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Aucune commande.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationListe
        base="/commandes-client"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="vente"
      />
    </div>
  );
}
