"use client";

import Link from "next/link";
import { Badge, Button, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { FournisseurFormDialog } from "@/components/fournisseurs/fournisseur-form-dialog";
import type { modifierFournisseur as modifierFournisseurAction, basculerActifFournisseur as basculerActifFournisseurAction } from "./actions";

type Fournisseur = {
  id: number;
  nom: string;
  adresse: string | null;
  telephone: string;
  email: string | null;
  nif: string | null;
  actif: boolean;
};

export function FournisseursTable({
  liste,
  peutEcrire,
  modifierFournisseur,
  basculerActifFournisseur,
}: {
  liste: Fournisseur[];
  peutEcrire: boolean;
  modifierFournisseur: typeof modifierFournisseurAction;
  basculerActifFournisseur: typeof basculerActifFournisseurAction;
}) {
  return (
    <DataTable
      records={liste}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucun fournisseur."
      columns={[
        {
          accessor: "nom",
          title: "Nom",
          render: (f) => (
            <Link href={`/fournisseurs/${f.id}`} className="font-medium hover:underline">
              {f.nom}
            </Link>
          ),
        },
        {
          accessor: "telephone",
          title: "Téléphone",
          render: (f) => <span className="font-mono tabular-nums">{f.telephone}</span>,
        },
        { accessor: "email", title: "Email", render: (f) => f.email ?? "—" },
        {
          accessor: "nif",
          title: "NIF",
          render: (f) => (f.nif ? <Badge color="gray" variant="light">NIF</Badge> : "—"),
        },
        {
          accessor: "actif",
          title: "Statut",
          render: (f) => (
            <Badge color={f.actif ? "green" : "gray"} variant="light">
              {f.actif ? "Actif" : "Inactif"}
            </Badge>
          ),
        },
        {
          accessor: "actions",
          title: "Actions",
          textAlign: "right",
          render: (f) => (
            <Group justify="flex-end" gap="xs">
              <Button component={Link} href={`/fournisseurs/${f.id}`} variant="subtle" size="xs">
                Voir
              </Button>
              {peutEcrire && (
                <>
                  <FournisseurFormDialog
                    action={modifierFournisseur.bind(null, f.id)}
                    fournisseur={f}
                    trigger={
                      <Button variant="subtle" size="xs">
                        Modifier
                      </Button>
                    }
                  />
                  <form action={basculerActifFournisseur.bind(null, f.id, !f.actif)}>
                    <Button type="submit" variant="subtle" size="xs">
                      {f.actif ? "Désactiver" : "Activer"}
                    </Button>
                  </form>
                </>
              )}
            </Group>
          ),
        },
      ]}
    />
  );
}
