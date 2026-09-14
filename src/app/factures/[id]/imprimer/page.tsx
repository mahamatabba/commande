import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant, montantEnLettres } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { MODE_REGLEMENT_LABEL, STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { STATUT_FACTURE_CLASS } from "@/lib/statut-style";
import { Badge } from "@/components/ui/badge";
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

  // Les montants sont lus tels qu'ils ont été figés à l'émission — ils ne
  // sont jamais recalculés à l'affichage : une facture déjà remise au client
  // ne doit plus changer, même si le taux de TVA évolue ensuite.
  const montantHT = facture.montantHt;
  const montantTVA = facture.montantTva;
  const montantTTC = facture.montantTotal;
  const montantRegle = facture.montantRegle;
  const resteAPayer = facture.resteAPayer ?? montantTTC - montantRegle;

  return (
    <FeuilleA4 barreOutils={<ImprimerBouton />}>
      <DocumentHeader label="FACTURE" numero={facture.numero} date={formatDate(facture.dateFacture)} />

      <div className="feuille-a4__corps text-[#1A1917]">
        <section className="mb-4 grid grid-cols-2 gap-4 print:break-inside-avoid">
          <div className="rounded-[2px] border border-[#D9D6D0] p-4 print:p-3">
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
          <div className="rounded-[2px] border border-[#D9D6D0] p-4 print:p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Références
            </h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Statut</dt>
                <dd>
                  <Badge variant="outline" className={STATUT_FACTURE_CLASS[facture.statut]}>
                    {libelle(STATUT_FACTURE_LABEL, facture.statut)}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Bon de commande</dt>
                <dd className="font-mono tabular-nums">{facture.commandeClient.numero}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Mode de règlement</dt>
                <dd>{libelle(MODE_REGLEMENT_LABEL, facture.commandeClient.modeReglement)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6B6862]">Régime de TVA</dt>
                <dd>{facture.exonereTva ? "Exonéré" : `Assujetti — ${formatTaux(facture.tauxTva)}`}</dd>
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
            {facture.commandeClient.lignes.map((l) => (
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
                {facture.exonereTva ? "TVA — exonérée" : `TVA (${formatTaux(facture.tauxTva)})`}
              </span>
              <span className="font-mono tabular-nums">{formatMontant(montantTVA)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[2px] bg-[#1E3A5F] px-3 py-2.5 text-white print:py-2">
              <span className="text-sm font-semibold">Total TTC</span>
              <span className="font-mono text-base font-semibold tabular-nums">
                {formatMontant(montantTTC)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[2px] border border-[#BEDACD] bg-[#E7F0EB] px-3 py-2 text-[#14563E] print:py-1.5">
              <span className="text-xs font-semibold">Déjà réglé</span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatMontant(montantRegle)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[2px] border border-[#EBD3A8] bg-[#FBF1E0] px-3 py-2 text-[#8A5300] print:py-1.5">
              <span className="text-xs font-semibold">Reste à payer</span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatMontant(resteAPayer)}
              </span>
            </div>
          </div>
        </section>

        <p className="mb-8 text-sm italic print:mb-5">
          Arrêtée la présente facture à la somme de : {montantEnLettres(montantTTC)}.
        </p>

        <BlocSignatures titre="Le Client" />
      </div>

      <DocumentFooter />
    </FeuilleA4>
  );
}
