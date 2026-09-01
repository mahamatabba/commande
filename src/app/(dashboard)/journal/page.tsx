import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { journalActivite } from "@/db/schema";
import { requirePermission } from "@/lib/permissions";
import { formatDateHeure } from "@/lib/format";
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
  connexion: "Connexion",
};

const LABEL_ENTITE: Record<string, string> = {
  commande_fournisseur: "Achat",
  commande_client: "Vente",
  facture: "Facture",
  reglement: "Règlement",
  fournisseur: "Fournisseur",
  client: "Client",
  article: "Article",
  utilisateur: "Utilisateur",
};

export default async function PageJournal({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; entite?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "journal:consulter");
  const { du, au, entite } = await searchParams;

  const conditions = [];
  if (du) conditions.push(gte(journalActivite.createdAt, new Date(du)));
  if (au) conditions.push(lte(journalActivite.createdAt, new Date(`${au}T23:59:59`)));
  if (entite) conditions.push(eq(journalActivite.entite, entite));

  const entrees = await db.query.journalActivite.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { user: true },
    orderBy: (j, { desc }) => desc(j.createdAt),
    limit: 200,
  });

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
          <Select name="entite" defaultValue={entite ?? "toutes"}>
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
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {e.details ? JSON.stringify(e.details) : "—"}
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
    </div>
  );
}
