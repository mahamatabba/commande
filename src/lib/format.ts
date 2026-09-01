/**
 * Formate un montant en FCFA sans décimale : "1 250 000 FCFA".
 * Implémentation manuelle du groupement par milliers (espace) pour ne pas
 * dépendre du support ICU complet de l'environnement d'exécution.
 */
export function formatMontant(montant: number): string {
  const entier = Math.round(montant);
  const negatif = entier < 0;
  const chiffres = Math.abs(entier).toString();
  const groupes: string[] = [];
  for (let i = chiffres.length; i > 0; i -= 3) {
    groupes.unshift(chiffres.slice(Math.max(0, i - 3), i));
  }
  return `${negatif ? "-" : ""}${groupes.join(" ")} FCFA`;
}

/** Formate une date au format JJ/MM/AAAA. */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const jour = String(d.getDate()).padStart(2, "0");
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const annee = d.getFullYear();
  return `${jour}/${mois}/${annee}`;
}

/** Formate une date + heure au format JJ/MM/AAAA HH:MM. */
export function formatDateHeure(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const heure = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${heure}:${minute}`;
}

const UNITES = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];

const DIZAINES = [
  "",
  "dix",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante-dix",
  "quatre-vingt",
  "quatre-vingt-dix",
];

/** Nombre de 0 à 99 en toutes lettres. */
function deuxChiffresEnLettres(n: number): string {
  if (n === 0) return "";
  if (n < 20) return UNITES[n];
  if (n < 70) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return DIZAINES[d];
    if (u === 1) return `${DIZAINES[d]} et un`;
    return `${DIZAINES[d]}-${UNITES[u]}`;
  }
  if (n < 80) {
    const reste = n - 60; // 10..19
    return reste === 11 ? "soixante et onze" : `soixante-${UNITES[reste]}`;
  }
  if (n === 80) return "quatre-vingts";
  return `quatre-vingt-${UNITES[n - 80]}`; // 81..99 -> UNITES[1..19]
}

/** Nombre de 0 à 999 en toutes lettres. */
function centaineEnLettres(n: number): string {
  if (n === 0) return "";
  const c = Math.floor(n / 100);
  const reste = n % 100;
  if (c === 0) return deuxChiffresEnLettres(reste);
  const prefixe = c === 1 ? "cent" : `${UNITES[c]} cent`;
  if (reste === 0) return c > 1 ? `${prefixe}s` : prefixe;
  return `${prefixe} ${deuxChiffresEnLettres(reste)}`;
}

/** Convertit un entier positif en toutes lettres, en français. */
export function nombreEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const entier = Math.round(Math.abs(n));

  const tranches: { valeur: number; nom: string; pluriel: boolean }[] = [
    { valeur: 1_000_000_000, nom: "milliard", pluriel: true },
    { valeur: 1_000_000, nom: "million", pluriel: true },
    { valeur: 1_000, nom: "mille", pluriel: false },
  ];

  let reste = entier;
  const parties: string[] = [];

  for (const tranche of tranches) {
    const quotient = Math.floor(reste / tranche.valeur);
    if (quotient > 0) {
      const prefixe = quotient === 1 && tranche.nom === "mille" ? "" : `${centaineEnLettres(quotient)} `;
      const nomTranche = tranche.pluriel && quotient > 1 ? `${tranche.nom}s` : tranche.nom;
      parties.push(`${prefixe}${nomTranche}`.trim());
      reste -= quotient * tranche.valeur;
    }
  }

  if (reste > 0 || parties.length === 0) {
    parties.push(centaineEnLettres(reste));
  }

  return parties.join(" ").replace(/\s+/g, " ").trim();
}

/** "un million deux cent cinquante mille francs CFA" */
export function montantEnLettres(montant: number): string {
  const mots = nombreEnLettres(montant);
  return `${mots.charAt(0).toUpperCase()}${mots.slice(1)} francs CFA`;
}
