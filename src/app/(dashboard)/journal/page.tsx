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
import { Button, Group, Paper, Select, Stack, TextInput, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";

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
    <Stack gap="md">
      <Title order={1} size="h2">Journal d&apos;activité</Title>

      <form>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <TextInput label="Du" name="du" type="date" defaultValue={du} />
          <TextInput label="Au" name="au" type="date" defaultValue={au} />
          <Select
            label="Entité"
            name="entite"
            defaultValue={entiteFiltre ?? "toutes"}
            w={180}
            data={[
              { value: "toutes", label: "Toutes" },
              ...Object.entries(LABEL_ENTITE).map(([valeur, lib]) => ({ value: valeur, label: lib })),
            ]}
          />
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
        </Group>
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          records={entrees}
          idAccessor="id"
          withTableBorder={false}
          noRecordsText="Aucune activité enregistrée."
          columns={[
            {
              accessor: "createdAt",
              title: "Date",
              render: (e) => <span className="font-mono tabular-nums whitespace-nowrap">{formatDateHeure(e.createdAt)}</span>,
            },
            { accessor: "user", title: "Utilisateur", render: (e) => e.user?.nomComplet ?? "—" },
            { accessor: "action", title: "Action", render: (e) => LABEL_ACTION[e.action] ?? e.action },
            {
              accessor: "entite",
              title: "Entité",
              render: (e) => (e.action === "connexion" ? "—" : (LABEL_ENTITE[e.entite] ?? e.entite)),
            },
            {
              accessor: "entiteId",
              title: "ID",
              render: (e) => (
                <span className="font-mono tabular-nums">{e.action === "connexion" ? "—" : (e.entiteId ?? "—")}</span>
              ),
            },
            {
              accessor: "details",
              title: "Détails",
              render: (e) => (
                <span
                  className="block max-w-sm truncate text-xs text-[var(--mantine-color-dimmed)]"
                  title={e.details ? formaterDetailsJournal(e.entite, e.details) : undefined}
                >
                  {e.details ? formaterDetailsJournal(e.entite, e.details) : "—"}
                </span>
              ),
            },
          ]}
        />
      </Paper>

      <PaginationListe
        base="/journal"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="entrée"
      />
    </Stack>
  );
}
