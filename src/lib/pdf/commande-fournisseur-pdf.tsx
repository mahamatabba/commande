import { formatDate, montantEnLettres } from "@/lib/format";
import { STATUT_COMMANDE_FOURNISSEUR_LABEL, libelle } from "@/lib/libelles";
import { TON_COMMANDE_FOURNISSEUR, tonDe } from "@/lib/statut-ton";
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
  type LignePdf,
} from "./gabarit";

export type DonneesCommandeFournisseur = {
  numero: string;
  dateCommande: Date;
  statut: string;
  montantTotal: number;
  fournisseur: { nom: string; adresse: string | null; telephone: string | null; nif: string | null };
  lignes: LignePdf[];
};

export function CommandeFournisseurPdf({
  commande,
}: {
  commande: DonneesCommandeFournisseur;
}) {
  return (
    <GabaritDocument
      titre={`Bon de commande ${commande.numero}`}
      label="BON DE COMMANDE"
      numero={commande.numero}
      date={formatDate(commande.dateCommande)}
    >
      <DeuxBoites
        gauche={
          <BlocTiers
            titre="Fournisseur"
            nom={commande.fournisseur.nom}
            adresse={commande.fournisseur.adresse}
            telephone={commande.fournisseur.telephone}
            nif={commande.fournisseur.nif}
          />
        }
        droite={
          <>
            <TitreBoite>Détails</TitreBoite>
            <Rang label="Statut">
              <BadgeStatut ton={tonDe(TON_COMMANDE_FOURNISSEUR, commande.statut)}>
                {libelle(STATUT_COMMANDE_FOURNISSEUR_LABEL, commande.statut)}
              </BadgeStatut>
            </Rang>
            <Rang label="Date de commande">{formatDate(commande.dateCommande)}</Rang>
          </>
        }
      />

      <TableauLignes lignes={commande.lignes} />

      <BlocTotaux>
        <TotalPrincipal label="Montant total" montant={commande.montantTotal} />
      </BlocTotaux>

      <MentionMontant>
        Arrêté le présent bon de commande à la somme de : {montantEnLettres(commande.montantTotal)}.
      </MentionMontant>

      <Signatures titre="Le Fournisseur" mention="Signature et cachet" />
    </GabaritDocument>
  );
}
