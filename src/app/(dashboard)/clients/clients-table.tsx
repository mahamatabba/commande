"use client";

import Link from "next/link";
import { Badge, Button, Group } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import type { modifierClient as modifierClientAction, basculerActifClient as basculerActifClientAction } from "./actions";

type Client = {
  id: number;
  nom: string;
  prenom: string | null;
  raisonSociale: string | null;
  telephone: string;
  email: string | null;
  adresse: string | null;
  nif: string | null;
  actif: boolean;
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export function ClientsTable({
  liste,
  peutEcrire,
  modifierClient,
  basculerActifClient,
}: {
  liste: Client[];
  peutEcrire: boolean;
  modifierClient: typeof modifierClientAction;
  basculerActifClient: typeof basculerActifClientAction;
}) {
  return (
    <DataTable
      records={liste}
      idAccessor="id"
      withTableBorder={false}
      noRecordsText="Aucun client."
      columns={[
        {
          accessor: "nom",
          title: "Nom / Raison sociale",
          render: (c) => (
            <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
              {nomAffiche(c)}
            </Link>
          ),
        },
        {
          accessor: "telephone",
          title: "Téléphone",
          render: (c) => <span className="font-mono tabular-nums">{c.telephone}</span>,
        },
        {
          accessor: "nif",
          title: "NIF",
          render: (c) => (c.nif ? <Badge color="gray" variant="light">NIF</Badge> : "—"),
        },
        {
          accessor: "actif",
          title: "Statut",
          render: (c) => (
            <Badge color={c.actif ? "green" : "gray"} variant="light">
              {c.actif ? "Actif" : "Inactif"}
            </Badge>
          ),
        },
        {
          accessor: "actions",
          title: "Actions",
          textAlign: "right",
          render: (c) => (
            <Group justify="flex-end" gap="xs">
              <Button component={Link} href={`/clients/${c.id}`} variant="subtle" size="xs">
                Voir
              </Button>
              {peutEcrire && (
                <>
                  <ClientFormDialog
                    action={modifierClient.bind(null, c.id)}
                    client={c}
                    trigger={
                      <Button variant="subtle" size="xs">
                        Modifier
                      </Button>
                    }
                  />
                  <form action={basculerActifClient.bind(null, c.id, !c.actif)}>
                    <Button type="submit" variant="subtle" size="xs">
                      {c.actif ? "Désactiver" : "Activer"}
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
