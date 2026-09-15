import { formatDate, montantEnLettres } from "@/lib/format";
import { MODE_REGLEMENT_LABEL, STATUT_COMMANDE_CLIENT_LABEL, libelle } from "@/lib/libelles";
import { TON_COMMANDE_CLIENT, tonDe } from "@/lib/statut-ton";
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

export type DonneesCommandeClient = {
  numero: string;
  dateCommande: Date;
  statut: string;
  modeReglement: string;
  montantTotal: number;
  client: {
    nom: string;
    prenom: string | null;
    raisonSociale: string | null;
    adresse: string | null;
    telephone: string | null;
    nif: string | null;
  };
  lignes: LignePdf[];
};

function nomAffiche(c: { nom: string; prenom: string | null; raisonSociale: string | null }) {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}

export function CommandeClientPdf({ commande }: { commande: DonneesCommandeClient }) {
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
            titre="Client"
            nom={nomAffiche(commande.client)}
            adresse={commande.client.adresse}
            telephone={commande.client.telephone}
            nif={commande.client.nif}
          />
        }
        droite={
          <>
            <TitreBoite>Détails</TitreBoite>
            <Rang label="Statut">
              <BadgeStatut ton={tonDe(TON_COMMANDE_CLIENT, commande.statut)}>
                {libelle(STATUT_COMMANDE_CLIENT_LABEL, commande.statut)}
              </BadgeStatut>
            </Rang>
            <Rang label="Mode de règlement">
              {libelle(MODE_REGLEMENT_LABEL, commande.modeReglement)}
            </Rang>
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

      <Signatures titre="Le Client" />
    </GabaritDocument>
  );
}
