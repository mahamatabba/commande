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
  index,
  uniqueIndex,
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

// Une proforma est un devis chiffré : elle n'engage ni la caisse ni la
// créance. Trois états suffisent — émise (en circulation chez le client),
// convertie (une vraie facture a pris le relais), annulée (abandonnée).
export const statutProformaEnum = pgEnum("statut_proforma", [
  "EMISE",
  "CONVERTIE",
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

// Taux de TVA en pourcentage (ex. 19.5). scale 2 pour accepter les demi-points.
const tauxTva = (colName: string) =>
  numeric(colName, { precision: 5, scale: 2, mode: "number" });

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
  // Certains clients (administrations, ONG, projets financés) sont exonérés de
  // TVA. C'est une caractéristique du client, proposée par défaut à l'émission
  // de la facture, où elle reste modifiable au cas par cas.
  exonereTva: boolean("exonere_tva").notNull().default(false),
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
  tauxTva: tauxTva("taux_tva").notNull().default(19.5),
  actif: boolean("actif").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Commandes fournisseur
// ---------------------------------------------------------------------------

export const commandesFournisseur = pgTable(
  "commandes_fournisseur",
  {
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
  },
  (table) => [
    index("idx_cf_fournisseur").on(table.fournisseurId),
    index("idx_cf_date").on(table.dateCommande),
    index("idx_cf_statut").on(table.statut),
  ],
);

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
  (table) => [
    index("idx_lcf_commande").on(table.commandeId),
    index("idx_lcf_article").on(table.articleId),
  ],
);

// ---------------------------------------------------------------------------
// Commandes client
// ---------------------------------------------------------------------------

// Le montant total d'une commande client est un montant HORS TAXE : c'est ce
// que saisit l'utilisateur ligne par ligne. La TVA n'apparaît qu'à l'émission
// de la facture, où elle est ajoutée par-dessus (voir table `factures`).
export const commandesClient = pgTable(
  "commandes_client",
  {
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
  },
  (table) => [
    index("idx_cc_client").on(table.clientId),
    index("idx_cc_date").on(table.dateCommande),
    index("idx_cc_statut").on(table.statut),
  ],
);

export const lignesCommandeClient = pgTable(
  "lignes_commande_client",
  {
    id: serial("id").primaryKey(),
    commandeId: integer("commande_id")
      .notNull()
      .references(() => commandesClient.id, { onDelete: "cascade" }),
    articleId: integer("article_id").references(() => articles.id),
    designation: varchar("designation", { length: 255 }).notNull(),
    quantite: numeric("quantite", { precision: 10, scale: 2, mode: "number" }).notNull(),
    prixUnitaire: montant("prix_unitaire").notNull(),
    // Prix d'achat figé au moment de la vente. Sans cet instantané, la marge
    // se recalculerait sur le prix d'achat courant du catalogue et les marges
    // des mois passés changeraient à chaque mise à jour de tarif.
    prixAchatUnitaire: montant("prix_achat_unitaire"),
    montantLigne: montant("montant_ligne").notNull(),
  },
  (table) => [
    index("idx_lcc_commande").on(table.commandeId),
    index("idx_lcc_article").on(table.articleId),
  ],
);

// ---------------------------------------------------------------------------
// Factures
// ---------------------------------------------------------------------------

// Décomposition monétaire d'une facture, figée à l'émission :
//   montantHt    = somme des lignes de la commande (les prix saisis sont HT)
//   tauxTva      = taux appliqué ce jour-là, 0 si le client est exonéré
//   montantTva   = montantHt × tauxTva / 100, arrondi au franc
//   montantTotal = montantHt + montantTva, c'est-à-dire le TTC réellement dû
// `montantTotal` reste la seule référence pour les règlements, le reste à
// payer et la caisse : c'est ce que le client paie.
export const factures = pgTable(
  "factures",
  {
    id: serial("id").primaryKey(),
    numero: varchar("numero", { length: 30 }).notNull().unique(),
    commandeClientId: integer("commande_client_id")
      .notNull()
      .references(() => commandesClient.id),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    dateFacture: timestamp("date_facture", { withTimezone: true }).notNull(),
    montantHt: montant("montant_ht").notNull().default(0),
    exonereTva: boolean("exonere_tva").notNull().default(false),
    tauxTva: tauxTva("taux_tva").notNull().default(0),
    montantTva: montant("montant_tva").notNull().default(0),
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
  },
  (table) => [
    // Garde-fou contre la double facturation d'une même vente : c'est la base
    // qui l'interdit, pas seulement le contrôle de statut applicatif.
    uniqueIndex("uq_factures_commande_client").on(table.commandeClientId),
    index("idx_factures_client").on(table.clientId),
    index("idx_factures_date").on(table.dateFacture),
    index("idx_factures_statut").on(table.statut),
  ],
);

// ---------------------------------------------------------------------------
// Factures proforma
// ---------------------------------------------------------------------------

// Une proforma est une facture d'intention : elle sert au client à obtenir un
// accord de financement ou un bon d'engagement avant l'achat. Elle n'est PAS
// une facture — aucun droit n'est né, aucune créance n'est ouverte, aucun
// règlement ne s'y rattache.
//
// D'où une table séparée plutôt qu'un simple type sur `factures` : toutes les
// requêtes existantes (chiffre d'affaires, impayés, caisse, statistiques)
// interrogent `factures` sans filtre de type. Ajouter une colonne y aurait
// fait entrer les proformas dans chacune d'elles, silencieusement, et gonflé
// le chiffre d'affaires de ventes qui n'ont jamais eu lieu.
//
// Les montants sont figés à l'émission, exactement comme sur une facture :
// c'est ce chiffrage-là qui a été remis au client, et la conversion doit
// produire une facture identique au franc près.
export const proformas = pgTable(
  "proformas",
  {
    id: serial("id").primaryKey(),
    numero: varchar("numero", { length: 30 }).notNull().unique(),
    commandeClientId: integer("commande_client_id")
      .notNull()
      .references(() => commandesClient.id),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    dateProforma: timestamp("date_proforma", { withTimezone: true }).notNull(),
    // Date limite de validité de l'offre, imprimée sur le document. Stockée
    // plutôt que recalculée à l'affichage : une proforma retrouvée six mois
    // plus tard doit afficher la date qu'elle portait le jour de sa remise.
    dateValidite: timestamp("date_validite", { withTimezone: true }).notNull(),
    montantHt: montant("montant_ht").notNull().default(0),
    exonereTva: boolean("exonere_tva").notNull().default(false),
    tauxTva: tauxTva("taux_tva").notNull().default(0),
    montantTva: montant("montant_tva").notNull().default(0),
    montantTotal: montant("montant_total").notNull(),
    statut: statutProformaEnum("statut").notNull().default("EMISE"),
    // Renseigné à la conversion : garde le lien entre le chiffrage remis au
    // client et la facture qui en découle.
    factureId: integer("facture_id").references(() => factures.id),
    nifClient: varchar("nif_client", { length: 100 }),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Une seule proforma en circulation par vente : deux documents chiffrés
    // différents chez le même client pour la même commande, c'est un litige
    // assuré. Les proformas converties ou annulées sont exclues de la
    // contrainte, pour qu'une offre expirée puisse être ré-émise.
    uniqueIndex("uq_proformas_commande_en_cours")
      .on(table.commandeClientId)
      .where(sql`statut = 'EMISE'`),
    index("idx_proformas_client").on(table.clientId),
    index("idx_proformas_commande").on(table.commandeClientId),
    index("idx_proformas_date").on(table.dateProforma),
    index("idx_proformas_statut").on(table.statut),
  ],
);

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
    index("idx_reglements_facture").on(table.factureId),
    index("idx_reglements_commande_fournisseur").on(table.commandeFournisseurId),
    index("idx_reglements_date").on(table.dateReglement),
  ],
);

// ---------------------------------------------------------------------------
// Caisse
// ---------------------------------------------------------------------------

export const mouvementsCaisse = pgTable(
  "mouvements_caisse",
  {
    id: serial("id").primaryKey(),
    reglementId: integer("reglement_id")
      .notNull()
      .references(() => reglements.id),
    sens: sensReglementEnum("sens").notNull(),
    montant: montant("montant").notNull(),
    // Porte la date du règlement, pas l'instant de la saisie : sans quoi un
    // règlement antidaté tomberait dans la caisse du jour de la saisie et les
    // écrans Caisse et Règlements ne donneraient pas la même période.
    dateMouvement: timestamp("date_mouvement", { withTimezone: true })
      .notNull()
      .defaultNow(),
    soldeApres: montant("solde_apres").notNull(),
  },
  (table) => [
    index("idx_mc_reglement").on(table.reglementId),
    index("idx_mc_date").on(table.dateMouvement),
  ],
);

// ---------------------------------------------------------------------------
// Journal d'activité
// ---------------------------------------------------------------------------

export const journalActivite = pgTable(
  "journal_activite",
  {
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
  },
  (table) => [
    index("idx_journal_user").on(table.userId),
    index("idx_journal_date").on(table.createdAt),
  ],
);

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
  proformasCreees: many(proformas),
  reglementsCreees: many(reglements),
  journalEntries: many(journalActivite),
}));

export const fournisseursRelations = relations(fournisseurs, ({ many }) => ({
  commandes: many(commandesFournisseur),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  commandes: many(commandesClient),
  factures: many(factures),
  proformas: many(proformas),
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
    // Une seule facture par vente — garanti par uq_factures_commande_client.
    facture: one(factures, {
      fields: [commandesClient.id],
      references: [factures.commandeClientId],
    }),
    // Plusieurs proformas possibles dans le temps (offre expirée puis
    // ré-émise), mais une seule « EMISE » à la fois.
    proformas: many(proformas),
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
  proformaOrigine: one(proformas, {
    fields: [factures.id],
    references: [proformas.factureId],
  }),
}));

export const proformasRelations = relations(proformas, ({ one }) => ({
  commandeClient: one(commandesClient, {
    fields: [proformas.commandeClientId],
    references: [commandesClient.id],
  }),
  client: one(clients, {
    fields: [proformas.clientId],
    references: [clients.id],
  }),
  facture: one(factures, {
    fields: [proformas.factureId],
    references: [factures.id],
  }),
  createur: one(users, {
    fields: [proformas.createdBy],
    references: [users.id],
  }),
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
