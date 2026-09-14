import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STATUTS_FACTURE,
  bornerDebut,
  bornerFin,
  lirePage,
  lireStatut,
} from "./filtres";

test("la borne « Du » commence au premier instant du jour demandé", () => {
  const debut = bornerDebut("2026-09-13");
  assert.ok(debut);
  assert.equal(debut.getFullYear(), 2026);
  assert.equal(debut.getMonth(), 8);
  assert.equal(debut.getDate(), 13);
  assert.equal(debut.getHours(), 0);
  assert.equal(debut.getMinutes(), 0);
});

test("la borne « Au » couvre la journée entière, sinon les documents du jour disparaissent", () => {
  const fin = bornerFin("2026-09-13");
  assert.ok(fin);
  assert.equal(fin.getDate(), 13);
  assert.equal(fin.getHours(), 23);
  assert.equal(fin.getMinutes(), 59);
  assert.equal(fin.getSeconds(), 59);
  assert.equal(fin.getMilliseconds(), 999);
});

test("une date est lue dans le fuseau local, pas en UTC", () => {
  // `new Date("2026-01-01")` vaut minuit UTC : à l'ouest de Greenwich il
  // retombe au 31 décembre. Le découpage explicite évite ce décalage.
  const debut = bornerDebut("2026-01-01");
  assert.ok(debut);
  assert.equal(debut.getDate(), 1);
  assert.equal(debut.getMonth(), 0);
});

test("une valeur qui n'est pas une date est ignorée, pas transmise à la base", () => {
  assert.equal(bornerDebut(undefined), undefined);
  assert.equal(bornerDebut(""), undefined);
  assert.equal(bornerDebut("13/09/2026"), undefined);
  assert.equal(bornerFin("hier"), undefined);
  assert.equal(bornerFin("2026-09"), undefined);
});

test("une date hors calendrier est refusée au lieu de glisser sur un autre mois", () => {
  assert.equal(bornerDebut("2026-13-01"), undefined);
  assert.equal(bornerDebut("2026-02-30"), undefined);
  assert.equal(bornerFin("2026-00-10"), undefined);
});

test("seul un statut connu est retenu", () => {
  assert.equal(lireStatut("SOLDEE", STATUTS_FACTURE), "SOLDEE");
  assert.equal(lireStatut("PAYEE", STATUTS_FACTURE), undefined);
  assert.equal(lireStatut("soldee", STATUTS_FACTURE), undefined);
  assert.equal(lireStatut(undefined, STATUTS_FACTURE), undefined);
  assert.equal(lireStatut("", STATUTS_FACTURE), undefined);
});

test("le numéro de page retombe toujours sur 1 quand la valeur est absurde", () => {
  assert.equal(lirePage("3"), 3);
  assert.equal(lirePage(undefined), 1);
  assert.equal(lirePage("0"), 1);
  assert.equal(lirePage("-2"), 1);
  assert.equal(lirePage("2.5"), 1);
  assert.equal(lirePage("abc"), 1);
});
