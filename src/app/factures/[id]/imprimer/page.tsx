import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { requirePermission } from "@/lib/permissions";
import { formatDate, formatMontant, montantEnLettres } from "@/lib/format";
import { AEI_INFO, TAUX_TVA_STANDARD } from "@/lib/constants";
import { ImprimerBouton } from "@/components/factures/imprimer-bouton";

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

  const montantTTC = facture.montantTotal;
  const montantHT = Math.round((montantTTC * 100) / (100 + TAUX_TVA_STANDARD));
  const montantTVA = montantTTC - montantHT;

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-zinc-900 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <ImprimerBouton />
      </div>

      <header className="mb-8 flex items-start justify-between border-b-2 border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold">{AEI_INFO.nom}</h1>
          <p className="text-sm text-zinc-600">{AEI_INFO.adresse}</p>
          <p className="text-sm text-zinc-600">Tél : {AEI_INFO.telephone} · {AEI_INFO.email}</p>
          <p className="text-sm text-zinc-600">NIF : {AEI_INFO.nif}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold">FACTURE</h2>
          <p className="text-sm">N° {facture.numero}</p>
          <p className="text-sm">Date : {formatDate(facture.dateFacture)}</p>
        </div>
      </header>

      <section className="mb-8">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Facturé à</h3>
        <p className="font-medium">{nomAffiche(facture.client)}</p>
        {facture.client.adresse && <p className="text-sm text-zinc-600">{facture.client.adresse}</p>}
        <p className="text-sm text-zinc-600">{facture.client.telephone}</p>
        {facture.nifClient && <p className="text-sm text-zinc-600">NIF : {facture.nifClient}</p>}
      </section>

      <table className="mb-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-800 text-left">
            <th className="py-2">Désignation</th>
            <th className="py-2 text-right">Qté</th>
            <th className="py-2 text-right">Prix unitaire</th>
            <th className="py-2 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {facture.commandeClient.lignes.map((l) => (
            <tr key={l.id} className="border-b border-zinc-200">
              <td className="py-2">{l.designation}</td>
              <td className="py-2 text-right">{l.quantite}</td>
              <td className="py-2 text-right">{formatMontant(l.prixUnitaire)}</td>
              <td className="py-2 text-right">{formatMontant(l.montantLigne)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mb-8 flex justify-end">
        <table className="w-64 text-sm">
          <tbody>
            <tr>
              <td className="py-1 text-zinc-600">Total HT</td>
              <td className="py-1 text-right">{formatMontant(montantHT)}</td>
            </tr>
            <tr>
              <td className="py-1 text-zinc-600">TVA ({TAUX_TVA_STANDARD}%)</td>
              <td className="py-1 text-right">{formatMontant(montantTVA)}</td>
            </tr>
            <tr className="border-t-2 border-zinc-800 font-bold">
              <td className="py-1">Total TTC</td>
              <td className="py-1 text-right">{formatMontant(montantTTC)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="mb-8 text-sm italic">
        Arrêtée la présente facture à la somme de : {montantEnLettres(montantTTC)}.
      </p>

      <footer className="mt-16 border-t pt-4 text-center text-xs text-zinc-500">
        {AEI_INFO.nom} — {AEI_INFO.adresse} — {AEI_INFO.telephone}
      </footer>
    </div>
  );
}
