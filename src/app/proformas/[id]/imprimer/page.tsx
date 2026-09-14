import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant, montantEnLettres } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { MODE_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import { ImprimerBouton } from "@/components/factures/imprimer-bouton";
import {
  BlocSignatures,
  DocumentFooter,
  DocumentHeader,
} from "@/components/documents/entete-document";
import { FeuilleA4 } from "@/components/documents/feuille-a4";

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export default async function PageImpressionProforma({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proformaId = Number(id);
  const session = await auth();
  requirePermission(session, "factures:read");

  const proforma = await db.query.proformas.findFirst({
    where: (p, { eq }) => eq(p.id, proformaId),
    with: { client: true, commandeClient: { with: { lignes: true } } },
  });
  if (!proforma) notFound();

  // Comme pour une facture, les montants sont lus tels qu'ils ont été figés :
  // le document remis au client ne doit plus bouger, même si le taux de TVA
  // ou le tarif évoluent ensuite.
  const montantHT = proforma.montantHt;
  const montantTVA = proforma.montantTva;
  const montantTTC = proforma.montantTotal;

  return (
    <FeuilleA4 barreOutils={<ImprimerBouton />}>
      <DocumentHeader
        label="FACTURE PROFORMA"
        numero={proforma.numero}
        date={formatDate(proforma.dateProforma)}
      />

      <div className="feuille-a4__corps text-[#1A1917]">
        <section className="mb-4 grid grid-cols-2 gap-4 print:break-inside-avoid">
          <div className="rounded-[2px] border border-[#D9D6D0] p-4 print:p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Destinataire
            </h3>
            <p className="text-sm font-semibold">{nomAffiche(proforma.client)}</p>
            {proforma.client.adresse && (
              <p className="mt-1 text-xs text-[#6B6862]">{proforma.client.adresse}</p>
            )}
            <p className="font-mono text-xs tabular-nums text-[#6B6862]">
              {proforma.client.telephone}
            </p>
            {proforma.nifClient && (
              <p className="font-mono text-xs tabular-nums text-[#6B6862]">
                NIF : {proforma.nifClient}
              </p>
            )}
          </div>
          <div className="rounded-[2px] border border-[#D9D6D0] p-4 print:p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Références
            </h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Valable jusqu&apos;au</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {formatDate(proforma.dateValidite)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Référence interne</dt>
                <dd className="font-mono tabular-nums">{proforma.commandeClient.numero}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Règlement prévu</dt>
                <dd>{libelle(MODE_REGLEMENT_LABEL, proforma.commandeClient.modeReglement)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Régime de TVA</dt>
                <dd>
                  {proforma.exonereTva ? "Exonéré" : `Assujetti — ${formatTaux(proforma.tauxTva)}`}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <table className="mb-4 w-full border-collapse rounded-[2px] text-sm">
          <thead>
            <tr className="border-b border-[#1E3A5F] bg-[#F4F3F0] text-left text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              <th className="px-3 py-2">Désignation</th>
              <th className="px-3 py-2 text-right">Qté</th>
              <th className="px-3 py-2 text-right">P.U. HT</th>
              <th className="px-3 py-2 text-right">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {proforma.commandeClient.lignes.map((l) => (
              <tr key={l.id} className="border-b border-[#EFEDE8] print:break-inside-avoid">
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

        <section className="mb-4 flex justify-end print:break-inside-avoid">
          <div className="w-72 space-y-2 text-sm print:space-y-1">
            <div className="flex justify-between px-1">
              <span className="text-[#6B6862]">Total HT</span>
              <span className="font-mono tabular-nums">{formatMontant(montantHT)}</span>
            </div>
            <div className="flex justify-between px-1">
              <span className="text-[#6B6862]">
                {proforma.exonereTva ? "TVA — exonérée" : `TVA (${formatTaux(proforma.tauxTva)})`}
              </span>
              <span className="font-mono tabular-nums">{formatMontant(montantTVA)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[2px] bg-[#1E3A5F] px-3 py-2.5 text-white print:py-2">
              <span className="text-sm font-semibold">Total TTC</span>
              <span className="font-mono text-base font-semibold tabular-nums">
                {formatMontant(montantTTC)}
              </span>
            </div>
          </div>
        </section>

        <p className="mb-4 text-sm italic">
          Arrêtée la présente facture proforma à la somme de : {montantEnLettres(montantTTC)}.
        </p>

        {/* Mention obligatoire : sans elle, le document pourrait être présenté
            comme une facture et servir à une déduction de TVA à laquelle il ne
            donne aucun droit. */}
        <p className="mb-8 rounded-[2px] border border-[#EBD3A8] bg-[#FBF1E0] px-3 py-2 text-xs text-[#8A5300] print:mb-5">
          Ce document est une facture proforma. Il ne constitue pas une facture définitive, ne vaut
          pas pièce comptable et n&apos;ouvre aucun droit à déduction de TVA. Offre valable jusqu&apos;au{" "}
          {formatDate(proforma.dateValidite)}.
        </p>

        <BlocSignatures titre="Bon pour accord — Le Client" mention="Date et signature" />
      </div>

      <DocumentFooter />
    </FeuilleA4>
  );
}
