import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["AGENT", "SUPERVISEUR", "ADMIN"]);

export const statutCommandeFournisseurEnum = pgEnum(
  "statut_commande_fournisseur",
  ["BROUILLON", "VALIDEE", "RECUE", "ANNULEE"],
);

export const statutCommandeClientEnum = pgEnum("statut_commande_client", [
  "BROUILLON",
  "VALIDEE",
  "FACTUREE",
  "ANNULEE",
]);

export const modeReglementEnum = pgEnum("mode_reglement", [
  "ESPECES",
  "BON_DE_COMMANDE",
]);

export const statutFactureEnum = pgEnum("statut_facture", [
  "NON_PAYEE",
  "PARTIELLEMENT_PAYEE",
  "SOLDEE",
  "ANNULEE",
]);

export const sensReglementEnum = pgEnum("sens_reglement", [
  "ENCAISSEMENT",
  "DECAISSEMENT",
]);

export const moyenReglementEnum = pgEnum("moyen_reglement", [
  "ESPECES",
  "VIREMENT",
  "MOBILE_MONEY",
]);

// Colonnes monétaires : numeric(14,2) en base, mais l'application ne manipule
// que des entiers de FCFA (aucun centime). mode "number" est sûr ici car les
// montants restent très en-deçà de Number.MAX_SAFE_INTEGER.
const montant = (colName: string) =>
  numeric(colName, { precision: 14, scale: 2, mode: "number" });

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nomComplet: varchar("nom_complet", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("AGENT"),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Référentiels
// ---------------------------------------------------------------------------

export const fournisseurs = pgTable("fournisseurs", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 255 }).notNull(),
  adresse: text("adresse"),
  telephone: varchar("telephone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  nif: varchar("nif", { length: 100 }),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 255 }).notNull(),
  prenom: varchar("prenom", { length: 255 }),
  raisonSociale: varchar("raison_sociale", { length: 255 }),
  telephone: varchar("telephone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  adresse: text("adresse"),
  nif: varchar("nif", { length: 100 }),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  designation: varchar("designation", { length: 255 }).notNull(),
  prixAchatIndicatif: montant("prix_achat_indicatif").notNull(),
  prixVente: montant("prix_vente").notNull(),
  tauxTva: numeric("taux_tva", { precision: 5, scale: 2, mode: "number" })
    .notNull()
    .default(18),
  actif: boolean("actif").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Commandes fournisseur
// ---------------------------------------------------------------------------

export const commandesFournisseur = pgTable("commandes_fournisseur", {
  id: serial("id").primaryKey(),
  numero: varchar("numero", { length: 30 }).notNull().unique(),
  fournisseurId: integer("fournisseur_id")
    .notNull()
    .references(() => fournisseurs.id),
  dateCommande: timestamp("date_commande", { withTimezone: true }).notNull(),
  statut: statutCommandeFournisseurEnum("statut")
    .notNull()
    .default("BROUILLON"),
  montantTotal: montant("montant_total").notNull().default(0),
  montantRegle: montant("montant_regle").notNull().default(0),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lignesCommandeFournisseur = pgTable(
  "lignes_commande_fournisseur",
  {
    id: serial("id").primaryKey(),
    commandeId: integer("commande_id")
      .notNull()
      .references(() => commandesFournisseur.id, { onDelete: "cascade" }),
    articleId: integer("article_id").references(() => articles.id),
    designation: varchar("designation", { length: 255 }).notNull(),
    quantite: numeric("quantite", { precision: 10, scale: 2, mode: "number" }).notNull(),
    prixUnitaire: montant("prix_unitaire").notNull(),
    montantLigne: montant("montant_ligne").notNull(),
  },
);

// ---------------------------------------------------------------------------
// Commandes client
// ---------------------------------------------------------------------------

export const commandesClient = pgTable("commandes_client", {
  id: serial("id").primaryKey(),
  numero: varchar("numero", { length: 30 }).notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  dateCommande: timestamp("date_commande", { withTimezone: true }).notNull(),
  modeReglement: modeReglementEnum("mode_reglement").notNull(),
  statut: statutCommandeClientEnum("statut").notNull().default("BROUILLON"),
  montantTotal: montant("montant_total").notNull().default(0),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lignesCommandeClient = pgTable("lignes_commande_client", {
  id: serial("id").primaryKey(),
  commandeId: integer("commande_id")
    .notNull()
    .references(() => commandesClient.id, { onDelete: "cascade" }),
  articleId: integer("article_id").references(() => articles.id),
  designation: varchar("designation", { length: 255 }).notNull(),
  quantite: numeric("quantite", { precision: 10, scale: 2, mode: "number" }).notNull(),
  prixUnitaire: montant("prix_unitaire").notNull(),
  montantLigne: montant("montant_ligne").notNull(),
});

// ---------------------------------------------------------------------------
// Factures
// ---------------------------------------------------------------------------

export const factures = pgTable("factures", {
  id: serial("id").primaryKey(),
  numero: varchar("numero", { length: 30 }).notNull().unique(),
  commandeClientId: integer("commande_client_id")
    .notNull()
    .references(() => commandesClient.id),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  dateFacture: timestamp("date_facture", { withTimezone: true }).notNull(),
  montantTotal: montant("montant_total").notNull(),
  montantRegle: montant("montant_regle").notNull().default(0),
  resteAPayer: montant("reste_a_payer").generatedAlwaysAs(
    (): ReturnType<typeof sql> =>
      sql`(montant_total - montant_regle)`,
  ),
  statut: statutFactureEnum("statut").notNull().default("NON_PAYEE"),
  nifClient: varchar("nif_client", { length: 100 }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Règlements
// ---------------------------------------------------------------------------

export const reglements = pgTable(
  "reglements",
  {
    id: serial("id").primaryKey(),
    sens: sensReglementEnum("sens").notNull(),
    montant: montant("montant").notNull(),
    dateReglement: timestamp("date_reglement", { withTimezone: true }).notNull(),
    factureId: integer("facture_id").references(() => factures.id),
    commandeFournisseurId: integer("commande_fournisseur_id").references(
      () => commandesFournisseur.id,
    ),
    moyen: moyenReglementEnum("moyen").notNull(),
    commentaire: text("commentaire"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "reglements_exactement_une_reference",
      sql`(
        (${table.factureId} IS NOT NULL AND ${table.commandeFournisseurId} IS NULL)
        OR
        (${table.factureId} IS NULL AND ${table.commandeFournisseurId} IS NOT NULL)
      )`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Caisse
// ---------------------------------------------------------------------------

export const mouvementsCaisse = pgTable("mouvements_caisse", {
  id: serial("id").primaryKey(),
  reglementId: integer("reglement_id")
    .notNull()
    .references(() => reglements.id),
  sens: sensReglementEnum("sens").notNull(),
  montant: montant("montant").notNull(),
  dateMouvement: timestamp("date_mouvement", { withTimezone: true })
    .notNull()
    .defaultNow(),
  soldeApres: montant("solde_apres").notNull(),
});

// ---------------------------------------------------------------------------
// Journal d'activité
// ---------------------------------------------------------------------------

export const journalActivite = pgTable("journal_activite", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entite: varchar("entite", { length: 100 }).notNull(),
  entiteId: integer("entite_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Compteurs de numérotation (CF-AAAA-0001, CC-AAAA-0001, FAC-AAAA-0001)
//
// Table technique non listée explicitement dans le cahier des charges, mais
// nécessaire pour garantir une numérotation continue, séquentielle et non
// réutilisable, générée en base dans une transaction (règle métier n°6).
// Une ligne par préfixe + année (ex. "FAC-2026"), incrémentée avec un verrou
// de ligne (SELECT ... FOR UPDATE) au moment de la génération du numéro.
// ---------------------------------------------------------------------------

export const compteursNumerotation = pgTable("compteurs_numerotation", {
  cle: varchar("cle", { length: 20 }).primaryKey(), // ex: "CF-2026", "FAC-2026"
  dernierNumero: integer("dernier_numero").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  commandesFournisseurCreees: many(commandesFournisseur),
  commandesClientCreees: many(commandesClient),
  facturesCreees: many(factures),
  reglementsCreees: many(reglements),
  journalEntries: many(journalActivite),
}));

export const fournisseursRelations = relations(fournisseurs, ({ many }) => ({
  commandes: many(commandesFournisseur),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  commandes: many(commandesClient),
  factures: many(factures),
}));

export const articlesRelations = relations(articles, ({ many }) => ({
  lignesCommandeFournisseur: many(lignesCommandeFournisseur),
  lignesCommandeClient: many(lignesCommandeClient),
}));

export const commandesFournisseurRelations = relations(
  commandesFournisseur,
  ({ one, many }) => ({
    fournisseur: one(fournisseurs, {
      fields: [commandesFournisseur.fournisseurId],
      references: [fournisseurs.id],
    }),
    createur: one(users, {
      fields: [commandesFournisseur.createdBy],
      references: [users.id],
    }),
    lignes: many(lignesCommandeFournisseur),
    reglements: many(reglements),
  }),
);

export const lignesCommandeFournisseurRelations = relations(
  lignesCommandeFournisseur,
  ({ one }) => ({
    commande: one(commandesFournisseur, {
      fields: [lignesCommandeFournisseur.commandeId],
      references: [commandesFournisseur.id],
    }),
    article: one(articles, {
      fields: [lignesCommandeFournisseur.articleId],
      references: [articles.id],
    }),
  }),
);

export const commandesClientRelations = relations(
  commandesClient,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [commandesClient.clientId],
      references: [clients.id],
    }),
    createur: one(users, {
      fields: [commandesClient.createdBy],
      references: [users.id],
    }),
    lignes: many(lignesCommandeClient),
    facture: many(factures),
  }),
);

export const lignesCommandeClientRelations = relations(
  lignesCommandeClient,
  ({ one }) => ({
    commande: one(commandesClient, {
      fields: [lignesCommandeClient.commandeId],
      references: [commandesClient.id],
    }),
    article: one(articles, {
      fields: [lignesCommandeClient.articleId],
      references: [articles.id],
    }),
  }),
);

export const facturesRelations = relations(factures, ({ one, many }) => ({
  commandeClient: one(commandesClient, {
    fields: [factures.commandeClientId],
    references: [commandesClient.id],
  }),
  client: one(clients, {
    fields: [factures.clientId],
    references: [clients.id],
  }),
  createur: one(users, {
    fields: [factures.createdBy],
    references: [users.id],
  }),
  reglements: many(reglements),
}));

export const reglementsRelations = relations(reglements, ({ one, many }) => ({
  facture: one(factures, {
    fields: [reglements.factureId],
    references: [factures.id],
  }),
  commandeFournisseur: one(commandesFournisseur, {
    fields: [reglements.commandeFournisseurId],
    references: [commandesFournisseur.id],
  }),
  createur: one(users, {
    fields: [reglements.createdBy],
    references: [users.id],
  }),
  mouvementsCaisse: many(mouvementsCaisse),
}));

export const mouvementsCaisseRelations = relations(
  mouvementsCaisse,
  ({ one }) => ({
    reglement: one(reglements, {
      fields: [mouvementsCaisse.reglementId],
      references: [reglements.id],
    }),
  }),
);

export const journalActiviteRelations = relations(
  journalActivite,
  ({ one }) => ({
    user: one(users, {
      fields: [journalActivite.userId],
      references: [users.id],
    }),
  }),
);
