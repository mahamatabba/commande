import { Document, Page, StyleSheet, Text, View, Image as ImagePdf } from "@react-pdf/renderer";
import { AEI_INFO } from "@/lib/constants";
import { formatMontant } from "@/lib/format";
import type { TonStatut } from "@/lib/statut-ton";
import { LOGO_AEI, LOGO_HP } from "./logos";

/*
 * Charpente commune aux quatre documents remis à un tiers : facture, facture
 * proforma, bon de commande client, bon de commande fournisseur.
 *
 * ── Pourquoi un vrai PDF plutôt qu'une page HTML imprimée ────────────────
 *
 * L'ancienne mise en page était du HTML mis en forme pour l'impression. Elle
 * dépendait donc entièrement du navigateur qui l'imprimait : marges par
 * défaut, échelle, en-têtes et pieds ajoutés par le navigateur, cases « fond
 * et couleurs » cochées ou non. Un même document sortait sur une feuille chez
 * l'un et sur deux chez l'autre, et le client recevait un fichier différent
 * selon le poste d'où il avait été produit.
 *
 * Ici, la pagination est calculée par le serveur, une fois, pour tout le
 * monde. Le fichier envoyé est celui qui a été composé : ce que l'écran
 * montre est exactement ce que le client reçoit et ce que l'imprimante sort.
 *
 * ── Unités ──────────────────────────────────────────────────────────────
 *
 * Tout est en points PostScript (1/72 de pouce), l'unité du format PDF. Une
 * page A4 mesure 595 × 842 pt. `MARGE` vaut 28 pt, soit un peu moins de
 * 10 mm, la marge utilisée jusqu'ici sur le papier.
 *
 * ── Polices ─────────────────────────────────────────────────────────────
 *
 * Helvetica est l'une des quatorze polices que tout lecteur PDF possède
 * d'office : aucun fichier à embarquer, aucun téléchargement au moment du
 * rendu, donc aucune panne possible de ce côté — et rien qui alourdisse le
 * fichier remis au client. Ses chiffres sont tous de même largeur, ce qui
 * suffit à aligner les colonnes de montants sans police à chasse fixe ; le
 * Courier des polices de base, lui, aurait détonné sur une facture.
 */

const MARGE = 28;

/** Hauteur exacte de l'en-tête, réservée en haut de chaque page. */
const HAUTEUR_ENTETE = 133;
/** Hauteur exacte du pied de page, réservée en bas de chaque page. */
const HAUTEUR_PIED = 41;

export const COULEURS = {
  encre: "#1A1917",
  gris: "#6B6862",
  grisClair: "#9C9A95",
  bordure: "#D9D6D0",
  filet: "#EFEDE8",
  filetFonce: "#E6E3DD",
  fond: "#F4F3F0",
  navy: "#1E3A5F",
  orange: "#FAA755",
  cyan: "#00AEEF",
  blanc: "#FFFFFF",
} as const;

/**
 * Pendant papier de `statut-style.ts` : les mêmes tons, en couleurs plutôt
 * qu'en classes. Les deux tables lisent `statut-ton.ts`, donc un statut ne
 * peut pas être coloré ici et oublié là-bas.
 */
const TONS: Record<TonStatut, { fond: string; texte: string; bordure: string }> = {
  neutre: { fond: "#F0EEE9", texte: "#6B6862", bordure: "#D9D6D0" },
  annulee: { fond: "#F0EEE9", texte: "#9C9A95", bordure: "#D9D6D0" },
  enCours: { fond: "#EEF2F7", texte: "#1E3A5F", bordure: "#C6D2E0" },
  bon: { fond: "#E7F0EB", texte: "#14563E", bordure: "#BEDACD" },
  attention: { fond: "#FBF1E0", texte: "#8A5300", bordure: "#EBD3A8" },
  urgent: { fond: "#F8E8E6", texte: "#8A211C", bordure: "#E3BEBB" },
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COULEURS.encre,
    paddingTop: HAUTEUR_ENTETE + 14,
    paddingBottom: HAUTEUR_PIED + 12,
  },
  corps: { paddingHorizontal: MARGE },

  // — En-tête ————————————————————————————————————————————————
  entete: { position: "absolute", top: 0, left: 0, right: 0 },
  enteteMarque: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: MARGE,
  },
  enteteRaison: { flex: 1, alignItems: "center", paddingHorizontal: 14 },
  filetOrange: { height: 3, backgroundColor: COULEURS.orange },
  enteteTitre: {
    height: 66,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: MARGE,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COULEURS.filetFonce,
    borderTopStyle: "solid",
  },
  carreAei: {
    width: 28,
    height: 28,
    backgroundColor: COULEURS.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  // — Pied de page ———————————————————————————————————————————
  pied: { position: "absolute", bottom: 0, left: 0, right: 0 },
  filetCyan: { height: 3, backgroundColor: COULEURS.cyan },
  piedCorps: {
    height: 38,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    // Pas de marge à droite : le badge NIF déborde jusqu'au bord du papier,
    // comme sur le papier à en-tête réel.
    paddingLeft: MARGE,
  },
  badgeNif: {
    backgroundColor: COULEURS.orange,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  numeroPage: {
    position: "absolute",
    bottom: HAUTEUR_PIED + 4,
    right: MARGE,
    fontSize: 6.5,
    color: COULEURS.grisClair,
  },

  // — Blocs de contenu ———————————————————————————————————————
  grille: { flexDirection: "row", marginBottom: 12 },
  boite: {
    flex: 1,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    borderStyle: "solid",
    padding: 10,
  },
  boiteTitre: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COULEURS.gris,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  rang: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  // — Tableau des lignes —————————————————————————————————————
  tableauEntete: {
    flexDirection: "row",
    backgroundColor: COULEURS.fond,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.navy,
    borderBottomStyle: "solid",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableauCellule: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COULEURS.gris,
    letterSpacing: 0.5,
  },
  tableauLigne: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.filet,
    borderBottomStyle: "solid",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  colQuantite: { width: 42, textAlign: "right" },
  colPrix: { width: 88, textAlign: "right" },
  colMontant: { width: 96, textAlign: "right" },

  // — Totaux —————————————————————————————————————————————————
  totaux: { alignItems: "flex-end", marginBottom: 12 },
  colonneTotaux: { width: 232 },
  totalSimple: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 5,
  },
  totalPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COULEURS.navy,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  totalSecondaire: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderStyle: "solid",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 5,
  },

  // — Bas de document ————————————————————————————————————————
  mention: { fontSize: 9, fontStyle: "italic", marginBottom: 20 },
  avertissement: {
    borderWidth: 1,
    borderStyle: "solid",
    padding: 8,
    marginBottom: 20,
    fontSize: 7.5,
    lineHeight: 1.4,
  },
  signatures: { flexDirection: "row" },
  signature: { flex: 1 },
  signatureTrait: {
    borderTopWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderTopStyle: "solid",
    paddingTop: 3,
    fontSize: 7.5,
    color: COULEURS.grisClair,
  },
});

/** Une ligne d'article, telle qu'elle est stockée sur une commande. */
export type LignePdf = {
  id: number;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montantLigne: number;
};

/**
 * Enveloppe d'un document : page A4, en-tête et pied de page répétés sur
 * chaque feuille — comme sur le papier à en-tête, dont chaque feuille porte
 * la marque.
 */
export function GabaritDocument({
  titre,
  label,
  numero,
  date,
  children,
}: {
  /** Titre inscrit dans les propriétés du fichier PDF. */
  titre: string;
  label: string;
  numero: string;
  date: string;
  children: React.ReactNode;
}) {
  return (
    <Document title={titre} author={AEI_INFO.nom} creator={AEI_INFO.nom} producer={AEI_INFO.nom}>
      <Page size="A4" style={styles.page}>
        <EnTete label={label} numero={numero} date={date} />
        <View style={styles.corps}>{children}</View>
        <Text
          fixed
          style={styles.numeroPage}
          // Sur un document d'une seule feuille — le cas courant — la mention
          // n'apprendrait rien et salirait le bas de page.
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Page ${pageNumber} / ${totalPages}` : ""
          }
        />
        <PiedDePage />
      </Page>
    </Document>
  );
}

function EnTete({ label, numero, date }: { label: string; numero: string; date: string }) {
  return (
    <View fixed style={styles.entete}>
      <View style={styles.enteteMarque}>
        <ImagePdf src={LOGO_AEI} style={{ width: 56, height: 40 }} />
        <View style={styles.enteteRaison}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: COULEURS.cyan }}>
            {AEI_INFO.nom}
          </Text>
          <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", marginTop: 2 }}>
            {AEI_INFO.tagline}
          </Text>
          <Text style={{ fontSize: 7, color: COULEURS.gris, marginTop: 2 }}>{AEI_INFO.adresse}</Text>
        </View>
        <ImagePdf src={LOGO_HP} style={{ width: 64, height: 42 }} />
      </View>
      <View style={styles.filetOrange} />
      <View style={styles.enteteTitre}>
        <View style={styles.carreAei}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: COULEURS.blanc }}>
            AEI
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 17, fontFamily: "Helvetica-Bold", color: COULEURS.navy }}>
            {label}
          </Text>
          <Text style={{ fontSize: 9, marginTop: 3 }}>N° {numero}</Text>
          <Text style={{ fontSize: 7.5, color: COULEURS.gris, marginTop: 2 }}>Date : {date}</Text>
        </View>
      </View>
    </View>
  );
}

function PiedDePage() {
  return (
    <View fixed style={styles.pied}>
      <View style={styles.filetCyan} />
      <View style={styles.piedCorps}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold" }}>
            {AEI_INFO.telephones.join("  -  ")}
          </Text>
          <View style={{ width: 18 }} />
          <View>
            {AEI_INFO.emails.map((email) => (
              <Text
                key={email}
                style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: COULEURS.cyan }}
              >
                {email}
              </Text>
            ))}
          </View>
        </View>
        <View style={styles.badgeNif}>
          <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: COULEURS.blanc }}>
            NIF : {AEI_INFO.nif}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Les deux encadrés côte à côte en tête de document. */
export function DeuxBoites({ gauche, droite }: { gauche: React.ReactNode; droite: React.ReactNode }) {
  return (
    <View style={styles.grille} wrap={false}>
      <View style={[styles.boite, { marginRight: 12 }]}>{gauche}</View>
      <View style={styles.boite}>{droite}</View>
    </View>
  );
}

export function TitreBoite({ children }: { children: string }) {
  return <Text style={styles.boiteTitre}>{children.toUpperCase()}</Text>;
}

/**
 * Coordonnées d'un tiers — client ou fournisseur. Les champs absents ne
 * laissent pas de ligne vide : une adresse non renseignée ne doit pas se voir
 * sur le document remis.
 */
export function BlocTiers({
  titre,
  nom,
  adresse,
  telephone,
  nif,
}: {
  titre: string;
  nom: string;
  adresse?: string | null;
  telephone?: string | null;
  nif?: string | null;
}) {
  return (
    <>
      <TitreBoite>{titre}</TitreBoite>
      <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>{nom}</Text>
      {adresse ? (
        <Text style={{ fontSize: 8, color: COULEURS.gris, marginTop: 3 }}>{adresse}</Text>
      ) : null}
      {telephone ? (
        <Text style={{ fontSize: 8, color: COULEURS.gris, marginTop: 2 }}>{telephone}</Text>
      ) : null}
      {nif ? (
        <Text style={{ fontSize: 8, color: COULEURS.gris, marginTop: 2 }}>NIF : {nif}</Text>
      ) : null}
    </>
  );
}

/** Une ligne « libellé … valeur » dans l'encadré des références. */
export function Rang({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.rang}>
      <Text style={{ fontSize: 8, color: COULEURS.gris }}>{label}</Text>
      {typeof children === "string" ? (
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function BadgeStatut({ ton, children }: { ton: TonStatut; children: string }) {
  const couleurs = TONS[ton];
  return (
    <View
      style={{
        backgroundColor: couleurs.fond,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        borderStyle: "solid",
        paddingHorizontal: 5,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: couleurs.texte }}>
        {children}
      </Text>
    </View>
  );
}

/**
 * Tableau des articles. Chaque ligne est insécable : elle passe entière sur la
 * feuille suivante plutôt que d'être coupée en deux par le saut de page.
 */
export function TableauLignes({
  lignes,
  libellePrix = "Prix unitaire",
  libelleMontant = "Montant",
}: {
  lignes: LignePdf[];
  libellePrix?: string;
  libelleMontant?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      {/* `fixed` sur un enfant d'un bloc qui se coupe le réinsère en tête de
          chaque suite de ce bloc — donc sur chaque feuille où le tableau
          continue, et seulement celles-là. Sans quoi la deuxième feuille
          d'une longue facture n'est qu'une colonne de chiffres sans titre.
          (Ne pas confondre avec `fixed` sur un enfant direct de `Page`, qui
          lui se répète sur toutes les feuilles : c'est ce qui fait l'en-tête
          et le pied de page.) */}
      <View style={styles.tableauEntete} fixed>
        <Text style={[styles.tableauCellule, { flex: 1 }]}>DÉSIGNATION</Text>
        <Text style={[styles.tableauCellule, styles.colQuantite]}>QTÉ</Text>
        <Text style={[styles.tableauCellule, styles.colPrix]}>{libellePrix.toUpperCase()}</Text>
        <Text style={[styles.tableauCellule, styles.colMontant]}>{libelleMontant.toUpperCase()}</Text>
      </View>
      {lignes.map((ligne) => (
        <View key={ligne.id} style={styles.tableauLigne} wrap={false}>
          <Text style={{ flex: 1, paddingRight: 8 }}>{ligne.designation}</Text>
          <Text style={styles.colQuantite}>{ligne.quantite}</Text>
          <Text style={styles.colPrix}>{formatMontant(ligne.prixUnitaire)}</Text>
          <Text style={styles.colMontant}>{formatMontant(ligne.montantLigne)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Colonne des totaux, alignée à droite sous le tableau. */
export function BlocTotaux({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.totaux} wrap={false}>
      <View style={styles.colonneTotaux}>{children}</View>
    </View>
  );
}

export function TotalSimple({ label, montant }: { label: string; montant: number }) {
  return (
    <View style={styles.totalSimple}>
      <Text style={{ color: COULEURS.gris }}>{label}</Text>
      <Text>{formatMontant(montant)}</Text>
    </View>
  );
}

export function TotalPrincipal({ label, montant }: { label: string; montant: number }) {
  return (
    <View style={styles.totalPrincipal}>
      <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: COULEURS.blanc }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: COULEURS.blanc }}>
        {formatMontant(montant)}
      </Text>
    </View>
  );
}

export function TotalSecondaire({
  label,
  montant,
  ton,
}: {
  label: string;
  montant: number;
  ton: TonStatut;
}) {
  const couleurs = TONS[ton];
  return (
    <View
      style={[
        styles.totalSecondaire,
        { backgroundColor: couleurs.fond, borderColor: couleurs.bordure },
      ]}
    >
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: couleurs.texte }}>
        {label}
      </Text>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: couleurs.texte }}>
        {formatMontant(montant)}
      </Text>
    </View>
  );
}

/** La phrase « Arrêtée la présente facture à la somme de… ». */
export function MentionMontant({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.mention} wrap={false}>
      {children}
    </Text>
  );
}

/** Encadré d'avertissement — la mention légale de la proforma. */
export function Avertissement({ ton, children }: { ton: TonStatut; children: React.ReactNode }) {
  const couleurs = TONS[ton];
  return (
    <View
      style={[
        styles.avertissement,
        { backgroundColor: couleurs.fond, borderColor: couleurs.bordure },
      ]}
      wrap={false}
    >
      <Text style={{ color: couleurs.texte, fontSize: 7.5, lineHeight: 1.4 }}>{children}</Text>
    </View>
  );
}

/**
 * Blocs de signature. Le côté droit est toujours AEI ; seul le cosignataire
 * change. L'espace au-dessus du trait doit rester suffisant pour une
 * signature manuscrite.
 */
export function Signatures({ titre, mention = "Signature" }: { titre: string; mention?: string }) {
  return (
    <View style={styles.signatures} wrap={false}>
      <View style={[styles.signature, { marginRight: 32 }]}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#4A4844" }}>{titre}</Text>
        <View style={{ height: 34 }} />
        <Text style={styles.signatureTrait}>{mention}</Text>
      </View>
      <View style={styles.signature}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#4A4844" }}>
          Pour {AEI_INFO.nom}
        </Text>
        <View style={{ height: 34 }} />
        <Text style={styles.signatureTrait}>Signature et cachet</Text>
      </View>
    </View>
  );
}
