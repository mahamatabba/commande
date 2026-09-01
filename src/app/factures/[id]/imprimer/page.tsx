import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant, montantEnLettres } from "@/lib/format";
import { AEI_INFO, TAUX_TVA_STANDARD } from "@/lib/constants";
import { ImprimerBouton } from "@/components/factures/imprimer-bouton";
import { DocumentFooter, DocumentHeader } from "@/components/documents/entete-document";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

const MODE_REGLEMENT_LABEL: Record<string, string> = {
  ESPECES: "Espèces",
  BON_DE_COMMANDE: "Bon de commande",
};

export default async function PageImpressionFacture({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const factureId = Number(id);
  const session = await auth();
  requirePermission(session, "factures:read");

  const facture = await db.query.factures.findFirst({
    where: (f, { eq }) => eq(f.id, factureId),
    with: { client: true, commandeClient: { with: { lignes: true } } },
  });
  if (!facture) notFound();

  const montantTTC = facture.montantTotal;
  const montantHT = Math.round((montantTTC * 100) / (100 + TAUX_TVA_STANDARD));
  const montantTVA = montantTTC - montantHT;
  const montantRegle = facture.montantRegle;
  const resteAPayer = facture.resteAPayer ?? montantTTC - montantRegle;

  return (
    <div className="mx-auto max-w-[794px] print:max-w-none">
      <div className="flex justify-end px-10 pt-4 print:hidden">
        <ImprimerBouton />
      </div>

      <div id="feuille-document" className="bg-white">
        <DocumentHeader label="FACTURE" numero={facture.numero} date={formatDate(facture.dateFacture)} />

        <div className="px-14 pb-10 text-[#1A1917] print:px-10 print:pb-10">
        <section className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-[2px] border border-[#D9D6D0] p-4">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Facturé à
            </h3>
            <p className="text-sm font-semibold">{nomAffiche(facture.client)}</p>
            {facture.client.adresse && (
              <p className="mt-1 text-xs text-[#6B6862]">{facture.client.adresse}</p>
            )}
            <p className="font-mono text-xs tabular-nums text-[#6B6862]">
              {facture.client.telephone}
            </p>
            {facture.nifClient && (
              <p className="font-mono text-xs tabular-nums text-[#6B6862]">
                NIF : {facture.nifClient}
              </p>
            )}
          </div>
          <div className="rounded-[2px] border border-[#D9D6D0] p-4">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Références
            </h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Bon de commande</dt>
                <dd className="font-mono tabular-nums">{facture.commandeClient.numero}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Mode de règlement</dt>
                <dd>
                  {MODE_REGLEMENT_LABEL[facture.commandeClient.modeReglement] ??
                    facture.commandeClient.modeReglement}
                </dd>
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
            {facture.commandeClient.lignes.map((l) => (
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
            <div className="flex justify-between px-1">
              <span className="text-[#6B6862]">Total HT</span>
              <span className="font-mono tabular-nums">{formatMontant(montantHT)}</span>
            </div>
            <div className="flex justify-between px-1">
              <span className="text-[#6B6862]">TVA ({TAUX_TVA_STANDARD}%)</span>
              <span className="font-mono tabular-nums">{formatMontant(montantTVA)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[2px] bg-[#1E3A5F] px-3 py-2.5 text-white">
              <span className="text-sm font-semibold">Total TTC</span>
              <span className="font-mono text-base font-semibold tabular-nums">
                {formatMontant(montantTTC)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[2px] border border-[#BEDACD] bg-[#E7F0EB] px-3 py-2 text-[#14563E]">
              <span className="text-xs font-semibold">Déjà réglé</span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatMontant(montantRegle)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[2px] border border-[#EBD3A8] bg-[#FBF1E0] px-3 py-2 text-[#8A5300]">
              <span className="text-xs font-semibold">Reste à payer</span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatMontant(resteAPayer)}
              </span>
            </div>
          </div>
        </section>

        <p className="mb-16 text-sm italic">
          Arrêtée la présente facture à la somme de : {montantEnLettres(montantTTC)}.
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
