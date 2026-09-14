import type { Transaction } from "@/db";
import { db } from "@/db";
import { journalActivite } from "@/db/schema";
import { formatMontant } from "@/lib/format";

export type EntiteJournal =
  | "commande_fournisseur"
  | "commande_client"
  | "facture"
  | "proforma"
  | "reglement"
  | "fournisseur"
  | "client"
  | "article"
  | "utilisateur";

export type ActionJournal =
  | "creation"
  | "modification"
  | "validation"
  | "annulation"
  | "reglement"
  | "conversion"
  | "connexion";

/**
 * Trace une action dans le journal d'activité (règle métier : toute
 * création, modification, annulation et tout règlement y est tracé).
 * Accepte `tx` pour être appelée à l'intérieur d'une transaction existante,
 * ou `db` directement pour une trace hors transaction (ex : connexion).
 */
export async function tracerActivite(
  executeur: Transaction | typeof db,
  params: {
    userId: number;
    action: ActionJournal;
    entite: EntiteJournal;
    entiteId?: number;
    details?: Record<string, unknown>;
  },
) {
  await executeur.insert(journalActivite).values({
    userId: params.userId,
    action: params.action,
    entite: params.entite,
    entiteId: params.entiteId,
    details: params.details ?? null,
  });
}

const ROLE_LABEL: Record<string, string> = {
  AGENT: "Agent",
  SUPERVISEUR: "Superviseur",
  ADMIN: "Administrateur",
};

const MODE_REGLEMENT_LABEL: Record<string, string> = {
  ESPECES: "Espèces",
  BON_DE_COMMANDE: "Bon de commande",
};

const STATUT_LABEL: Record<string, string> = {
  VALIDEE: "Validée",
  RECUE: "Reçue",
};

const CIBLE_LABEL: Record<string, string> = {
  facture: "facture",
  commande_fournisseur: "commande fournisseur",
};

const CHAMP_LABEL: Record<string, string> = {
  modeReglement: "Mode de règlement",
};

/**
 * Résume les `details` JSON d'une entrée de journal en une phrase lisible,
 * pour l'affichage dans `/journal` — le contenu brut n'a de sens que pour un
 * développeur, un utilisateur métier a besoin d'une phrase.
 */
export function formaterDetailsJournal(entite: string, details: unknown): string {
  if (!details || typeof details !== "object") return "—";
  const d = details as Record<string, unknown>;
  const texte = (v: unknown) => (typeof v === "string" ? v : undefined);
  const nombre = (v: unknown) => (typeof v === "number" ? v : undefined);

  if (entite === "utilisateur") {
    if (d.motDePasseReinitialise) return "Mot de passe réinitialisé";
    const role = texte(d.role);
    if (role) {
      const parties = [texte(d.nomComplet), ROLE_LABEL[role] ?? role, texte(d.email)];
      if (typeof d.actif === "boolean") parties.push(d.actif ? "actif" : "désactivé");
      return parties.filter(Boolean).join(" — ");
    }
  }

  if (entite === "commande_client" || entite === "commande_fournisseur") {
    const champ = texte(d.champ);
    if (champ) {
      const label = (v: unknown) => (texte(v) ? (MODE_REGLEMENT_LABEL[texte(v)!] ?? texte(v)) : String(v));
      return `${CHAMP_LABEL[champ] ?? champ} : ${label(d.ancienneValeur)} → ${label(d.nouvelleValeur)}`;
    }
    const motif = texte(d.motif);
    if (motif) return `Motif : ${motif}`;
    const statut = texte(d.statut);
    if (statut) return STATUT_LABEL[statut] ?? statut;
    const numero = texte(d.numero);
    if (numero) {
      const montant = nombre(d.montantTotal);
      const mode = texte(d.modeReglement);
      return [numero, montant !== undefined ? formatMontant(montant) : undefined, mode ? `(${MODE_REGLEMENT_LABEL[mode] ?? mode})` : undefined]
        .filter(Boolean)
        .join(" — ");
    }
  }

  if (entite === "proforma") {
    const motif = texte(d.motif);
    if (motif) return `Motif : ${motif}`;
    const numeroFacture = texte(d.numeroFacture);
    if (numeroFacture) return `${texte(d.numero) ?? "Proforma"} convertie en facture ${numeroFacture}`;
    const numero = texte(d.numero);
    if (numero) {
      const montant = nombre(d.montantTotal);
      return `${numero}${montant !== undefined ? ` — ${formatMontant(montant)}` : ""}`;
    }
  }

  if (entite === "facture") {
    const motif = texte(d.motif);
    if (motif) {
      const repris = nombre(d.montantRepris);
      return `Motif : ${motif}${repris ? ` (${formatMontant(repris)} repris)` : ""}`;
    }
    const numero = texte(d.numero);
    if (numero) {
      const montant = nombre(d.montantTotal);
      return `${numero} — ${montant !== undefined ? formatMontant(montant) : ""} (${d.auComptant ? "au comptant" : "à crédit"})`.trim();
    }
  }

  if (entite === "reglement") {
    const montant = nombre(d.montant);
    if (montant !== undefined) {
      const cible = texte(d.cible);
      return `${formatMontant(montant)} sur ${cible ? (CIBLE_LABEL[cible] ?? cible) : "—"} #${d.cibleId}`;
    }
  }

  if (typeof d.actif === "boolean" && Object.keys(d).length === 1) {
    return d.actif ? "Réactivé" : "Désactivé";
  }

  const code = texte(d.code);
  const designation = texte(d.designation);
  if (code && designation) {
    const prixVente = nombre(d.prixVente);
    return `${code} — ${designation}${prixVente !== undefined ? ` (${formatMontant(prixVente)})` : ""}`;
  }

  const nom = texte(d.nom);
  if (nom) {
    const identite = texte(d.raisonSociale) || [nom, texte(d.prenom)].filter(Boolean).join(" ");
    const telephone = texte(d.telephone);
    return telephone ? `${identite} — ${telephone}` : identite;
  }

  return JSON.stringify(d);
}
