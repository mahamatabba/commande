import { formatDate, montantEnLettres } from "@/lib/format";
import { formatTaux } from "@/lib/tva";
import { MODE_REGLEMENT_LABEL, STATUT_FACTURE_LABEL, libelle } from "@/lib/libelles";
import { TON_FACTURE, tonDe } from "@/lib/statut-ton";
import {
  BadgeStatut,
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
  TotalSecondaire,
  TotalSimple,
  type LignePdf,
} from "./gabarit";

export type DonneesFacture = {
  numero: string;
  dateFacture: Date;
  statut: string;
  exonereTva: boolean;
  tauxTva: number;
  montantHt: number;
  montantTva: number;
  montantTotal: number;
  montantRegle: number;
  resteAPayer: number | null;
  nifClient: string | null;
  client: { nom: string; prenom: string | null; raisonSociale: string | null; adresse: string | null; telephone: string | null };
  commandeClient: { numero: string; modeReglement: string; lignes: LignePdf[] };
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export function FacturePdf({ facture }: { facture: DonneesFacture }) {
  // Les montants sont lus tels qu'ils ont été figés à l'émission — jamais
  // recalculés : une facture déjà remise au client ne doit plus changer, même
  // si le taux de TVA évolue ensuite.
  const montantTTC = facture.montantTotal;
  const resteAPayer = facture.resteAPayer ?? montantTTC - facture.montantRegle;

  return (
    <GabaritDocument
      titre={`Facture ${facture.numero}`}
      label="FACTURE"
      numero={facture.numero}
      date={formatDate(facture.dateFacture)}
    >
      <DeuxBoites
        gauche={
          <BlocTiers
            titre="Facturé à"
            nom={nomAffiche(facture.client)}
            adresse={facture.client.adresse}
            telephone={facture.client.telephone}
            nif={facture.nifClient}
          />
        }
        droite={
          <>
            <TitreBoite>Références</TitreBoite>
            <Rang label="Statut">
              <BadgeStatut ton={tonDe(TON_FACTURE, facture.statut)}>
                {libelle(STATUT_FACTURE_LABEL, facture.statut)}
              </BadgeStatut>
            </Rang>
            <Rang label="Bon de commande">{facture.commandeClient.numero}</Rang>
            <Rang label="Mode de règlement">
              {libelle(MODE_REGLEMENT_LABEL, facture.commandeClient.modeReglement)}
            </Rang>
            <Rang label="Régime de TVA">
              {facture.exonereTva ? "Exonéré" : `Assujetti — ${formatTaux(facture.tauxTva)}`}
            </Rang>
          </>
        }
      />

      <TableauLignes
        lignes={facture.commandeClient.lignes}
        libellePrix="P.U. HT"
        libelleMontant="Montant HT"
      />

      <BlocTotaux>
        <TotalSimple label="Total HT" montant={facture.montantHt} />
        <TotalSimple
          label={facture.exonereTva ? "TVA — exonérée" : `TVA (${formatTaux(facture.tauxTva)})`}
          montant={facture.montantTva}
        />
        <TotalPrincipal label="Total TTC" montant={montantTTC} />
        <TotalSecondaire label="Déjà réglé" montant={facture.montantRegle} ton="bon" />
        <TotalSecondaire label="Reste à payer" montant={resteAPayer} ton="attention" />
      </BlocTotaux>

      <MentionMontant>
        Arrêtée la présente facture à la somme de : {montantEnLettres(montantTTC)}.
      </MentionMontant>

      <Signatures titre="Le Client" />
    </GabaritDocument>
  );
}
