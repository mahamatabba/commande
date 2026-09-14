import assert from "node:assert/strict";
import { test } from "node:test";
import { decomposerTva, formatTaux } from "./tva";
import { TAUX_TVA_STANDARD } from "./constants";

test("la TVA s'ajoute au montant hors taxe, elle ne s'en déduit pas", () => {
  const totaux = decomposerTva(1_000_000);
  assert.equal(totaux.montantHt, 1_000_000);
  assert.equal(totaux.tauxTva, TAUX_TVA_STANDARD);
  assert.equal(totaux.montantTva, 195_000);
  assert.equal(totaux.montantTotal, 1_195_000);
});

test("un client exonéré ne paie aucune TVA", () => {
  const totaux = decomposerTva(650_000, { exonere: true });
  assert.equal(totaux.exonereTva, true);
  assert.equal(totaux.tauxTva, 0);
  assert.equal(totaux.montantTva, 0);
  assert.equal(totaux.montantTotal, 650_000);
});

test("un taux explicite prime sur le taux standard", () => {
  const totaux = decomposerTva(100_000, { taux: 9 });
  assert.equal(totaux.montantTva, 9_000);
  assert.equal(totaux.montantTotal, 109_000);
});

test("l'exonération l'emporte sur un taux explicite", () => {
  const totaux = decomposerTva(100_000, { exonere: true, taux: 9 });
  assert.equal(totaux.montantTva, 0);
});

test("la TVA est arrondie au franc, jamais laissée en décimales", () => {
  const totaux = decomposerTva(333);
  assert.equal(Number.isInteger(totaux.montantTva), true);
  assert.equal(totaux.montantTva, Math.round((333 * TAUX_TVA_STANDARD) / 100));
});

test("un montant nul reste nul", () => {
  const totaux = decomposerTva(0);
  assert.equal(totaux.montantTva, 0);
  assert.equal(totaux.montantTotal, 0);
});

test("le taux s'affiche à la française, sans zéro inutile", () => {
  assert.equal(formatTaux(19.5), "19,5 %");
  assert.equal(formatTaux(18), "18 %");
  assert.equal(formatTaux(0), "0 %");
});
