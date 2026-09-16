import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { commandesFournisseur, fournisseurs } from "@/db/schema";
import { can, requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import {
  STATUTS_COMMANDE_FOURNISSEUR,
  bornerDebut,
  bornerFin,
  bornerPagination,
  lienPagination,
  lirePage,
  lireStatut,
} from "@/lib/filtres";
import { PaginationListe } from "@/components/shared/pagination-liste";
import { STATUT_COMMANDE_FOURNISSEUR_LABEL, libelle } from "@/lib/libelles";
import { STATUT_COMMANDE_FOURNISSEUR_BADGE } from "@/lib/statut-style";
import { ActionIcon, Badge, Button, Group, Paper, Select, Stack, TextInput, Title } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { ApercuDocumentDialog } from "@/components/documents/apercu-document-dialog";
import { Eye, FileText } from "lucide-react";

/** Nombre d'achats affichés par page. */
const PAR_PAGE = 50;

export default async function PageCommandesFournisseur({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; du?: string; au?: string; page?: string }>;
}) {
  const session = await auth();
  requirePermission(session, "commandes_fournisseur:read");
  const peutEcrire = can(session, "commandes_fournisseur:write");
  const peutVoirDecaissements = can(session, "decaissements:read");
  const params = await searchParams;
  const { statut, du, au } = params;
  const pageDemandee = lirePage(params.page);

  const statutFiltre = lireStatut(statut, STATUTS_COMMANDE_FOURNISSEUR);
  const debut = bornerDebut(du);
  const fin = bornerFin(au);

  const conditions = [
    statutFiltre ? eq(commandesFournisseur.statut, statutFiltre) : undefined,
    debut ? gte(commandesFournisseur.dateCommande, debut) : undefined,
    fin ? lte(commandesFournisseur.dateCommande, fin) : undefined,
  ].filter(Boolean);
  const filtre = conditions.length > 0 ? and(...conditions) : undefined;

  const [comptes, commandes] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(commandesFournisseur)
      .innerJoin(fournisseurs, eq(commandesFournisseur.fournisseurId, fournisseurs.id))
      .where(filtre),
    db
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
      .where(filtre)
      // L'`id` départage deux achats du même jour, sinon l'ordre peut varier
      // d'une page à l'autre et une ligne se répéter.
      .orderBy(desc(commandesFournisseur.dateCommande), desc(commandesFournisseur.id))
      .limit(PAR_PAGE)
      .offset((pageDemandee - 1) * PAR_PAGE),
  ]);

  const total = comptes[0]?.total ?? 0;
  const { nbPages, pageCourante } = bornerPagination(pageDemandee, total, PAR_PAGE);
  if (pageCourante !== pageDemandee) {
    redirect(lienPagination("/commandes-fournisseur", params, pageCourante));
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Title order={1} size="h2">Achats</Title>
        {peutEcrire && (
          <Button component={Link} href="/commandes-fournisseur/nouvelle">
            Nouvel achat
          </Button>
        )}
      </Group>

      <form>
        <Group align="flex-end" wrap="wrap" gap="sm">
          <Select
            label="Statut"
            name="statut"
            defaultValue={statutFiltre}
            placeholder="Tous"
            clearable
            w={160}
            data={STATUTS_COMMANDE_FOURNISSEUR.map((s) => ({
              value: s,
              label: libelle(STATUT_COMMANDE_FOURNISSEUR_LABEL, s),
            }))}
          />
          <TextInput label="Du" name="du" type="date" defaultValue={du} />
          <TextInput label="Au" name="au" type="date" defaultValue={au} />
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          {(statut || du || au) && (
            <Button variant="subtle" component={Link} href="/commandes-fournisseur">
              Réinitialiser
            </Button>
          )}
        </Group>
      </form>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          records={commandes}
          idAccessor="id"
          withTableBorder={false}
          noRecordsText="Aucune commande."
          columns={[
            {
              accessor: "numero",
              title: "Numéro",
              render: (c) => (
                <Link href={`/commandes-fournisseur/${c.id}`} className="font-mono font-medium tabular-nums hover:underline">
                  {c.numero}
                </Link>
              ),
            },
            { accessor: "fournisseurNom", title: "Fournisseur" },
            {
              accessor: "dateCommande",
              title: "Date",
              render: (c) => <span className="font-mono tabular-nums">{formatDate(c.dateCommande)}</span>,
            },
            {
              accessor: "statut",
              title: "Statut",
              render: (c) => (
                <Badge {...STATUT_COMMANDE_FOURNISSEUR_BADGE[c.statut]}>
                  {libelle(STATUT_COMMANDE_FOURNISSEUR_LABEL, c.statut)}
                </Badge>
              ),
            },
            {
              accessor: "montantTotal",
              title: "Montant",
              textAlign: "right",
              render: (c) => <span className="font-mono tabular-nums">{formatMontant(c.montantTotal)}</span>,
            },
            ...(peutVoirDecaissements
              ? [
                  {
                    accessor: "montantRegle",
                    title: "Réglé",
                    textAlign: "right" as const,
                    render: (c: (typeof commandes)[number]) => (
                      <span className="font-mono tabular-nums">{formatMontant(c.montantRegle!)}</span>
                    ),
                  },
                ]
              : []),
            {
              accessor: "actions",
              title: "",
              textAlign: "right",
              render: (c) => (
                <Group justify="flex-end" gap={4} wrap="nowrap">
                  <ActionIcon
                    component={Link}
                    href={`/commandes-fournisseur/${c.id}`}
                    variant="subtle"
                    color="gray"
                    title="Voir le détail"
                    aria-label="Voir le détail"
                  >
                    <Eye size={16} />
                  </ActionIcon>
                  <ApercuDocumentDialog
                    href={`/commandes-fournisseur/${c.id}/pdf`}
                    titre={`Bon de commande ${c.numero}`}
                    nomFichier={`bon-commande-${c.numero}`}
                    trigger={
                      <ActionIcon variant="subtle" color="gray" title="Aperçu PDF" aria-label="Aperçu PDF">
                        <FileText size={16} />
                      </ActionIcon>
                    }
                  />
                </Group>
              ),
            },
          ]}
        />
      </Paper>

      <PaginationListe
        base="/commandes-fournisseur"
        params={params}
        page={pageCourante}
        nbPages={nbPages}
        total={total}
        nom="achat"
      />
    </Stack>
  );
}
