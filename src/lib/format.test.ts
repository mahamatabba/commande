import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatDate,
  formatDateHeure,
  formatMontant,
  montantEnLettres,
  nombreEnLettres,
} from "./format";

test("un montant est groupé par milliers et libellé en FCFA", () => {
  assert.equal(formatMontant(1_250_000), "1 250 000 FCFA");
  assert.equal(formatMontant(1_000), "1 000 FCFA");
  assert.equal(formatMontant(999), "999 FCFA");
  assert.equal(formatMontant(0), "0 FCFA");
});

test("un montant négatif garde son signe (reprise de caisse)", () => {
  assert.equal(formatMontant(-1_300_000), "-1 300 000 FCFA");
});

test("le FCFA n'a pas de centime : le montant est arrondi", () => {
  assert.equal(formatMontant(1_234.6), "1 235 FCFA");
  assert.equal(formatMontant(1_234.4), "1 234 FCFA");
});

test("les dates s'écrivent JJ/MM/AAAA", () => {
  assert.equal(formatDate(new Date(2026, 8, 13)), "13/09/2026");
  assert.equal(formatDate(new Date(2026, 0, 5)), "05/01/2026");
  assert.equal(formatDateHeure(new Date(2026, 8, 13, 7, 5)), "13/09/2026 07:05");
});

test("les nombres en toutes lettres suivent l'orthographe française", () => {
  assert.equal(nombreEnLettres(0), "zéro");
  assert.equal(nombreEnLettres(21), "vingt et un");
  assert.equal(nombreEnLettres(71), "soixante et onze");
  assert.equal(nombreEnLettres(80), "quatre-vingts");
  assert.equal(nombreEnLettres(81), "quatre-vingt-un");
  assert.equal(nombreEnLettres(95), "quatre-vingt-quinze");
  assert.equal(nombreEnLettres(100), "cent");
  assert.equal(nombreEnLettres(200), "deux cents");
  assert.equal(nombreEnLettres(1_000), "mille");
  assert.equal(nombreEnLettres(1_200), "mille deux cents");
  assert.equal(nombreEnLettres(1_000_000), "un million");
  assert.equal(nombreEnLettres(2_000_000), "deux millions");
});

test("le montant en lettres d'une facture TTC est correct", () => {
  // 1 000 000 HT + 19,5 % de TVA : la somme qui figure sur le document.
  assert.equal(
    montantEnLettres(1_195_000),
    "Un million cent quatre-vingt-quinze mille francs CFA",
  );
});
