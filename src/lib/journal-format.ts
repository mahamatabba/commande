import { formatMontant } from "@/lib/format";

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
 *
 * Séparée de `src/lib/journal.ts` (qui importe `db`) pour rester utilisable
 * depuis un composant client sans y entraîner le code serveur.
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
