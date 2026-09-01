import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant, montantEnLettres } from "@/lib/format";
import { AEI_INFO } from "@/lib/constants";
import { STATUT_COMMANDE_CLIENT_CLASS } from "@/lib/statut-style";
import { Badge } from "@/components/ui/badge";
import { ImprimerBouton } from "@/components/factures/imprimer-bouton";
import { DocumentFooter, DocumentHeader } from "@/components/documents/entete-document";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

const MODE_REGLEMENT_LABEL: Record<string, string> = {
  ESPECES: "Espèces",
  BON_DE_COMMANDE: "Bon de commande",
};

export default async function PageImpressionCommandeClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commandeId = Number(id);
  const session = await auth();
  requirePermission(session, "commandes_client:read");

  const commande = await db.query.commandesClient.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: { client: true, lignes: true },
  });
  if (!commande) notFound();

  return (
    <div className="mx-auto max-w-[794px] print:max-w-none">
      <div className="flex justify-end px-10 pt-4 print:hidden">
        <ImprimerBouton />
      </div>

      <div id="feuille-document" className="bg-white">
        <DocumentHeader
          label="BON DE COMMANDE"
          numero={commande.numero}
          date={formatDate(commande.dateCommande)}
        />

      <div className="px-14 pb-10 text-[#1A1917] print:px-10 print:pb-10">
        <section className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-[2px] border border-[#D9D6D0] p-4">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Client
            </h3>
            <p className="text-sm font-semibold">{nomAffiche(commande.client)}</p>
            {commande.client.adresse && (
              <p className="mt-1 text-xs text-[#6B6862]">{commande.client.adresse}</p>
            )}
            <p className="font-mono text-xs tabular-nums text-[#6B6862]">
              {commande.client.telephone}
            </p>
            {commande.client.nif && (
              <p className="font-mono text-xs tabular-nums text-[#6B6862]">
                NIF : {commande.client.nif}
              </p>
            )}
          </div>
          <div className="rounded-[2px] border border-[#D9D6D0] p-4">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Détails
            </h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Statut</dt>
                <dd>
                  <Badge variant="outline" className={STATUT_COMMANDE_CLIENT_CLASS[commande.statut]}>
                    {STATUT_LABEL[commande.statut]}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Mode de règlement</dt>
                <dd>{MODE_REGLEMENT_LABEL[commande.modeReglement] ?? commande.modeReglement}</dd>
              </div>
            </dl>
          </div>
        </section>

        <table className="mb-8 w-full border-collapse rounded-[2px] text-sm">
          <thead>
            <tr className="border-b border-[#1E3A5F] bg-[#F4F3F0] text-left text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              <th className="px-3 py-2">Désignation</th>
              <th className="px-3 py-2 text-right">Qté</th>
              <th className="px-3 py-2 text-right">Prix unitaire</th>
              <th className="px-3 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {commande.lignes.map((l) => (
              <tr key={l.id} className="border-b border-[#EFEDE8]">
                <td className="px-3 py-2">{l.designation}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{l.quantite}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMontant(l.prixUnitaire)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMontant(l.montantLigne)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mb-8 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-[2px] bg-[#1E3A5F] px-3 py-2.5 text-white">
              <span className="text-sm font-semibold">Montant total</span>
              <span className="font-mono text-base font-semibold tabular-nums">
                {formatMontant(commande.montantTotal)}
              </span>
            </div>
          </div>
        </section>

        <p className="mb-16 text-sm italic">
          Arrêté le présent bon de commande à la somme de : {montantEnLettres(commande.montantTotal)}.
        </p>

        <section className="grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="mb-10 font-semibold text-[#4A4844]">Le Client</p>
            <div className="border-t border-[#D9D6D0] pt-1 text-[#9C9A95]">Signature</div>
          </div>
          <div>
            <p className="mb-10 font-semibold text-[#4A4844]">Pour {AEI_INFO.nom}</p>
            <div className="border-t border-[#D9D6D0] pt-1 text-[#9C9A95]">Signature et cachet</div>
          </div>
        </section>
      </div>

      <DocumentFooter />
      </div>
    </div>
  );
}
