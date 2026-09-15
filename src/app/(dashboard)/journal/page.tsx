import { redirect } from "next/navigation";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { journalActivite } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { formatDateHeure } from "@/lib/format";
import { formaterDetailsJournal } from "@/lib/journal";
import {
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { PaginationListe } from "@/components/shared/pagination-liste";
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

const LABEL_ACTION: Record<string, string> = {
  creation: "Création",
  modification: "Modification",
  validation: "Validation",
  annulation: "Annulation",
  reglement: "Règlement",
  conversion: "Conversion",
  connexion: "Connexion",
};

const LABEL_ENTITE: Record<string, string> = {
  commande_fournisseur: "Achat",
  commande_client: "Vente",
  facture: "Facture",
  proforma: "Proforma",
  reglement: "Règlement",
  fournisseur: "Fournisseur",
  client: "Client",
  article: "Article",
  utilisateur: "Utilisateur",
};

/** Entités connues du journal, dans l'ordre d'affichage du filtre. */
const ENTITES = Object.keys(LABEL_ENTITE);

/** Nombre d'entrées affichées par page. */
const PAR_PAGE = 100;

export default async function PageJournal({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; entite?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "journal:consulter");
  const params = await searchParams;
  const { du, au, entite } = params;
  const pageDemandee = lirePage(params.page);

  // L'entité est validée contre la liste connue. Deux raisons : une valeur
  // arbitraire ne doit pas partir vers PostgreSQL, et surtout le choix
  // « Toutes » du formulaire envoie `entite=toutes` — comparé tel quel, il ne
  // correspondait à aucune ligne et le journal s'affichait vide.
  const entiteFiltre = lireStatut(entite, ENTITES);
  // Mêmes bornes de journée que partout ailleurs : `new Date("2026-09-13")`
  // était interprété en UTC et décalait le filtre d'une journée.
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    debut ? gte(journalActivite.createdAt, debut) : undefined,
    fin ? lte(journalActivite.createdAt, fin) : undefined,
    entiteFiltre ? eq(journalActivite.entite, entiteFiltre) : undefined,
  ].filter(Boolean);
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  // Le journal est une pièce de contrôle : il doit rester consultable en
  // entier. L'ancienne limite fixe de 200 lignes rendait tout ce qui était
  // plus ancien définitivement invisible, sans le dire.
  const [comptes, entrees] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(journalActivite).where(filtre),
    db.query.journalActivite.findMany({
      where: filtre,
      with: { user: true },
      // L'`id` départage deux entrées de la même milliseconde.
      orderBy: (j, { desc }) => [desc(j.createdAt), desc(j.id)],
      limit: PAR_PAGE,
      offset: (pageDemandee - 1) * PAR_PAGE,
    }),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/journal", params, pageCourante));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Journal d&apos;activité</h1>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="du">Du</Label>
          <Input id="du" name="du" type="date" defaultValue={du} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="au">Au</Label>
          <Input id="au" name="au" type="date" defaultValue={au} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="entite">Entité</Label>
          <Select name="entite" defaultValue={entiteFiltre ?? "toutes"}>
            <SelectTrigger id="entite" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes</SelectItem>
              {Object.entries(LABEL_ENTITE).map(([valeur, libelle]) => (
                <SelectItem key={valeur} value={valeur}>
                  {libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entrees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono tabular-nums whitespace-nowrap">{formatDateHeure(e.createdAt)}</TableCell>
                <TableCell>{e.user?.nomComplet ?? "—"}</TableCell>
                <TableCell>{LABEL_ACTION[e.action] ?? e.action}</TableCell>
                <TableCell>{e.action === "connexion" ? "—" : (LABEL_ENTITE[e.entite] ?? e.entite)}</TableCell>
                <TableCell className="font-mono tabular-nums">{e.action === "connexion" ? "—" : (e.entiteId ?? "—")}</TableCell>
                <TableCell
                  className="max-w-sm truncate text-xs text-muted-foreground"
                  title={e.details ? formaterDetailsJournal(e.entite, e.details) : undefined}
                >
                  {e.details ? formaterDetailsJournal(e.entite, e.details) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {entrees.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucune activité enregistrée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationListe
        base="/journal"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="entrée"
      />
    </div>
  );
}
