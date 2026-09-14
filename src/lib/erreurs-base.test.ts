import assert from "node:assert/strict";
import { test } from "node:test";
import { ErreurMetier, estViolationUnicite, messageErreurBase } from "./erreurs-base";

test("une contrainte nommée donne la phrase métier correspondante", () => {
  const message = messageErreurBase({
    code: "23505",
    constraint: "uq_factures_commande_client",
  });
  assert.match(message ?? "", /déjà été facturée/);
});

test("une violation d'unicité inconnue reste compréhensible", () => {
  assert.equal(
    messageErreurBase({ code: "23505", constraint: "une_contrainte_inconnue" }),
    "Cette valeur existe déjà : elle doit être unique.",
  );
});

test("clé étrangère et contrainte de cohérence ont chacune leur message", () => {
  assert.equal(
    messageErreurBase({ code: "23503" }),
    "L'élément référencé n'existe pas ou n'est plus disponible.",
  );
  assert.equal(
    messageErreurBase({ code: "23514" }),
    "Les données saisies ne respectent pas une règle de cohérence.",
  );
});

test("l'erreur enveloppée par le driver Neon est reconnue quand même", () => {
  const enveloppee = Object.assign(new Error("db error"), {
    cause: { code: "23505", constraint: "articles_code_unique" },
  });
  assert.match(messageErreurBase(enveloppee) ?? "", /code article/);
  assert.equal(estViolationUnicite(enveloppee, "articles_code_unique"), true);
});

test("une panne technique n'est PAS traduite : elle doit remonter", () => {
  assert.equal(messageErreurBase(new Error("connexion perdue")), null);
  assert.equal(messageErreurBase({ code: "08006" }), null);
  assert.equal(messageErreurBase("texte"), null);
  assert.equal(messageErreurBase(null), null);
  assert.equal(messageErreurBase(undefined), null);
});

test("estViolationUnicite distingue la contrainte demandée", () => {
  const erreur = { code: "23505", constraint: "users_email_unique" };
  assert.equal(estViolationUnicite(erreur), true);
  assert.equal(estViolationUnicite(erreur, "users_email_unique"), true);
  assert.equal(estViolationUnicite(erreur, "articles_code_unique"), false);
  assert.equal(estViolationUnicite({ code: "23503" }), false);
  assert.equal(estViolationUnicite(new Error("boom")), false);
});

test("ErreurMetier transporte un message destiné à l'utilisateur", () => {
  const erreur = new ErreurMetier("Cette facture est annulée.");
  assert.ok(erreur instanceof Error);
  assert.equal(erreur.name, "ErreurMetier");
  assert.equal(erreur.message, "Cette facture est annulée.");
});
