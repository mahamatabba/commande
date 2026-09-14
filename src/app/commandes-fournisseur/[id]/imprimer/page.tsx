import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant, montantEnLettres } from "@/lib/format";
import { STATUT_COMMANDE_FOURNISSEUR_CLASS } from "@/lib/statut-style";
import { Badge } from "@/components/ui/badge";
import { ImprimerBouton } from "@/components/factures/imprimer-bouton";
import {
  BlocSignatures,
  DocumentFooter,
  DocumentHeader,
} from "@/components/documents/entete-document";
import { FeuilleA4 } from "@/components/documents/feuille-a4";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  RECUE: "Reçue",
  ANNULEE: "Annulée",
};

export default async function PageImpressionCommandeFournisseur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commandeId = Number(id);
  const session = await auth();
  requirePermission(session, "commandes_fournisseur:read");

  const commande = await db.query.commandesFournisseur.findFirst({
    where: (c, { eq }) => eq(c.id, commandeId),
    with: { fournisseur: true, lignes: true },
  });
  if (!commande) notFound();

  return (
    <FeuilleA4 barreOutils={<ImprimerBouton />}>
      <DocumentHeader
        label="BON DE COMMANDE"
        numero={commande.numero}
        date={formatDate(commande.dateCommande)}
      />

      <div className="feuille-a4__corps text-[#1A1917]">
        <section className="mb-4 grid grid-cols-2 gap-4 print:break-inside-avoid">
          <div className="rounded-[2px] border border-[#D9D6D0] p-4 print:p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Fournisseur
            </h3>
            <p className="text-sm font-semibold">{commande.fournisseur.nom}</p>
            {commande.fournisseur.adresse && (
              <p className="mt-1 text-xs text-[#6B6862]">{commande.fournisseur.adresse}</p>
            )}
            <p className="font-mono text-xs tabular-nums text-[#6B6862]">
              {commande.fournisseur.telephone}
            </p>
            {commande.fournisseur.nif && (
              <p className="font-mono text-xs tabular-nums text-[#6B6862]">
                NIF : {commande.fournisseur.nif}
              </p>
            )}
          </div>
          <div className="rounded-[2px] border border-[#D9D6D0] p-4 print:p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#6B6862] uppercase">
              Statut
            </h3>
            <Badge variant="outline" className={STATUT_COMMANDE_FOURNISSEUR_CLASS[commande.statut]}>
              {STATUT_LABEL[commande.statut]}
            </Badge>
          </div>
        </section>

        <table className="mb-4 w-full border-collapse rounded-[2px] text-sm">
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
            <div className="flex items-center justify-between rounded-[2px] bg-[#1E3A5F] px-3 py-2.5 text-white print:py-2">
              <span className="text-sm font-semibold">Montant total</span>
              <span className="font-mono text-base font-semibold tabular-nums">
                {formatMontant(commande.montantTotal)}
              </span>
            </div>
          </div>
        </section>

        <p className="mb-8 text-sm italic print:mb-5">
          Arrêté le présent bon de commande à la somme de : {montantEnLettres(commande.montantTotal)}.
        </p>

        <BlocSignatures titre="Le Fournisseur" mention="Signature et cachet" />
      </div>

      <DocumentFooter />
    </FeuilleA4>
  );
}
