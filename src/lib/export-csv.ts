/**
 * Export tableur (CSV) des listes, à ouvrir dans Excel.
 *
 * Format choisi pour un Excel réglé en français : séparateur « ; », virgule
 * décimale, BOM UTF-8 (sans lui, Excel lit les accents de travers), dates
 * jj/mm/aaaa. Les montants sont des nombres bruts, sans « FCFA » ni espace
 * de milliers, pour pouvoir être additionnés.
 */
export type ColonneCsv<T> = { titre: string; valeur: (ligne: T) => string | number | Date | null | undefined };

function cellule(v: string | number | Date | null | undefined): string {
  if (v === null || v === undefined) return "";
  let texte: string;
  if (v instanceof Date) {
    texte = `${String(v.getDate()).padStart(2, "0")}/${String(v.getMonth() + 1).padStart(2, "0")}/${v.getFullYear()}`;
  } else if (typeof v === "number") {
    texte = String(v).replace(".", ",");
  } else {
    texte = v;
    // Neutralise une formule injectée dans une donnée saisie (=, +, -, @).
    if (/^[=+\-@]/.test(texte)) texte = `'${texte}`;
  }
  return /[;"\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export function reponseCsv<T>(lignes: T[], colonnes: ColonneCsv<T>[], nomFichier: string): Response {
  const contenu = [
    colonnes.map((c) => cellule(c.titre)).join(";"),
    ...lignes.map((l) => colonnes.map((c) => cellule(c.valeur(l))).join(";")),
  ].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${contenu}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}-${date}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export function nomTiers(c: { nom: string; prenom: string | null; raisonSociale: string | null }): string {
  if (c.raisonSociale) return c.raisonSociale;
  return c.prenom ? `${c.nom} ${c.prenom}` : c.nom;
}
