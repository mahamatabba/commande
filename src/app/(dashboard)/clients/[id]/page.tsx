import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, commandesClient, factures } from "@/db/schema";
import { can } from "@/lib/permissions";
import { formatDate, formatMontant } from "@/lib/format";
import { STATUT_COMMANDE_CLIENT_CLASS, STATUT_FACTURE_CLASS } from "@/lib/statut-style";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { Button } from "@/components/ui/button";
import { modifierClient } from "../actions";

const STATUT_COMMANDE_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

const STATUT_FACTURE_LABEL: Record<string, string> = {
  NON_PAYEE: "Non payée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  SOLDEE: "Soldée",
  ANNULEE: "Annulée",
};

export default async function PageClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = Number(id);
  const session = await auth();
  const peutEcrire = can(session, "referentiels:write");
  const peutVoirSolde = can(session, "impayes:read");

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) notFound();

  const commandes = await db
    .select()
    .from(commandesClient)
    .where(eq(commandesClient.clientId, clientId))
    .orderBy(desc(commandesClient.dateCommande));

  const facturesClient = await db
    .select()
    .from(factures)
    .where(eq(factures.clientId, clientId))
    .orderBy(desc(factures.dateFacture));

  let soldeDu = 0;
  if (peutVoirSolde) {
    const [{ total }] = await db
      .select({ total: sql<number>`coalesce(sum(${factures.resteAPayer}), 0)` })
      .from(factures)
      .where(and(eq(factures.clientId, clientId), ne(factures.statut, "ANNULEE")));
    soldeDu = Number(total);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {client.raisonSociale || `${client.nom} ${client.prenom ?? ""}`.trim()}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">{client.telephone}</span>
            {client.email && <span>· {client.email}</span>}
            {client.nif && (
              <Badge variant="secondary" className="font-mono tabular-nums">
                NIF {client.nif}
              </Badge>
            )}
            <Badge variant={client.actif ? "default" : "outline"}>{client.actif ? "Actif" : "Inactif"}</Badge>
          </div>
          {client.adresse && <p className="mt-1 text-sm text-muted-foreground">{client.adresse}</p>}
          {peutVoirSolde && (
            soldeDu > 0 ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#E3BEBB] bg-[#F8E8E6] px-3 py-1.5 text-sm text-[#8A211C]">
                <span>Solde dû :</span>
                <span className="font-mono text-base font-semibold tabular-nums">{formatMontant(soldeDu)}</span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Solde dû :{" "}
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {formatMontant(soldeDu)}
                </span>
              </p>
            )
          )}
        </div>
        {peutEcrire && (
          <ClientFormDialog
            action={modifierClient.bind(null, client.id)}
            client={client}
            trigger={<Button variant="outline">Modifier</Button>}
          />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Ventes</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Mode de règlement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/commandes-client/${c.id}`}
                      className="font-mono font-medium tabular-nums hover:underline"
                    >
                      {c.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{formatDate(c.dateCommande)}</TableCell>
                  <TableCell>{c.modeReglement === "ESPECES" ? "Espèces" : "Bon de commande"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUT_COMMANDE_CLIENT_CLASS[c.statut]}>
                      {STATUT_COMMANDE_LABEL[c.statut]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatMontant(c.montantTotal)}
                  </TableCell>
                </TableRow>
              ))}
              {commandes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Aucune commande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Factures</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                {peutVoirSolde && <TableHead>Statut</TableHead>}
                <TableHead className="text-right">Montant</TableHead>
                {peutVoirSolde && <TableHead className="text-right">Reste à payer</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturesClient.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Link href={`/factures/${f.id}`} className="font-mono font-medium tabular-nums hover:underline">
                      {f.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{formatDate(f.dateFacture)}</TableCell>
                  {peutVoirSolde && (
                    <TableCell>
                      <Badge variant="outline" className={STATUT_FACTURE_CLASS[f.statut]}>
                        {STATUT_FACTURE_LABEL[f.statut]}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatMontant(f.montantTotal)}
                  </TableCell>
                  {peutVoirSolde && (
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMontant(f.resteAPayer ?? 0)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {facturesClient.length === 0 && (
                <TableRow>
                  <TableCell colSpan={peutVoirSolde ? 5 : 3} className="py-6 text-center text-muted-foreground">
                    Aucune facture.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
