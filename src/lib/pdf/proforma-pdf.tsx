import { formatDate, montantEnLettres } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { MODE_REGLEMENT_LABEL, libelle } from "@/lib/libelles";
import {
  Avertissement,
  BlocTiers,
  BlocTotaux,
  DeuxBoites,
  GabaritDocument,
  MentionMontant,
  Rang,
  Signatures,
  TableauLignes,
  TitreBoite,
  TotalPrincipal,
  TotalSimple,
  type LignePdf,
} from "./gabarit";

export type DonneesProforma = {
  numero: string;
  dateProforma: Date;
  dateValidite: Date;
  exonereTva: boolean;
  tauxTva: number;
  montantHt: number;
  montantTva: number;
  montantTotal: number;
  nifClient: string | null;
  client: {
    nom: string;
    prenom: string | null;
    raisonSociale: string | null;
    adresse: string | null;
    telephone: string | null;
  };
  commandeClient: { numero: string; modeReglement: string; lignes: LignePdf[] };
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export function ProformaPdf({ proforma }: { proforma: DonneesProforma }) {
  // Comme pour une facture, les montants sont lus tels qu'ils ont été figés :
  // le document remis au client ne doit plus bouger, même si le taux de TVA
  // ou le tarif évoluent ensuite.
  const montantTTC = proforma.montantTotal;

  return (
    <GabaritDocument
      titre={`Facture proforma ${proforma.numero}`}
      label="FACTURE PROFORMA"
      numero={proforma.numero}
      date={formatDate(proforma.dateProforma)}
    >
      <DeuxBoites
        gauche={
          <BlocTiers
            titre="Destinataire"
            nom={nomAffiche(proforma.client)}
            adresse={proforma.client.adresse}
            telephone={proforma.client.telephone}
            nif={proforma.nifClient}
          />
        }
        droite={
          <>
            <TitreBoite>Références</TitreBoite>
            <Rang label="Valable jusqu'au">{formatDate(proforma.dateValidite)}</Rang>
            <Rang label="Référence interne">{proforma.commandeClient.numero}</Rang>
            <Rang label="Règlement prévu">
              {libelle(MODE_REGLEMENT_LABEL, proforma.commandeClient.modeReglement)}
            </Rang>
            <Rang label="Régime de TVA">
              {proforma.exonereTva ? "Exonéré" : `Assujetti — ${formatTaux(proforma.tauxTva)}`}
            </Rang>
          </>
        }
      />

      <TableauLignes
        lignes={proforma.commandeClient.lignes}
        libellePrix="P.U. HT"
        libelleMontant="Montant HT"
      />

      <BlocTotaux>
        <TotalSimple label="Total HT" montant={proforma.montantHt} />
        <TotalSimple
          label={proforma.exonereTva ? "TVA — exonérée" : `TVA (${formatTaux(proforma.tauxTva)})`}
          montant={proforma.montantTva}
        />
        <TotalPrincipal label="Total TTC" montant={montantTTC} />
      </BlocTotaux>

      <MentionMontant>
        Arrêtée la présente facture proforma à la somme de : {montantEnLettres(montantTTC)}.
      </MentionMontant>

      {/* Mention obligatoire : sans elle, le document pourrait être présenté
          comme une facture et servir à une déduction de TVA à laquelle il ne
          donne aucun droit. */}
      <Avertissement ton="attention">
        Ce document est une facture proforma. Il ne constitue pas une facture définitive, ne vaut
        pas pièce comptable et n&apos;ouvre aucun droit à déduction de TVA. Offre valable
        jusqu&apos;au {formatDate(proforma.dateValidite)}.
      </Avertissement>

      <Signatures titre="Bon pour accord — Le Client" mention="Date et signature" />
    </GabaritDocument>
  );
}
