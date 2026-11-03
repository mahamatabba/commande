# AEI — Gestion commerciale

Application de gestion commerciale pour Abdeldjalil Étude Informatique (AEI) :
achats fournisseurs, ventes clients, facturation, caisse et statistiques,
avec cloisonnement strict par rôle (`AGENT`, `SUPERVISEUR`, `ADMIN`).

## Stack

- Next.js 15 (App Router, TypeScript, Server Actions)
- Neon (PostgreSQL serverless) via `@neondatabase/serverless`
- Drizzle ORM + drizzle-kit
- Tailwind CSS + shadcn/ui
- Auth.js v5 (Credentials provider, sessions JWT)
- Zod (validation serveur)

### Pourquoi Auth.js v5 plutôt que better-auth

Le projet n'a besoin que d'une authentification email/mot de passe interne
(pas de OAuth, pas de magic link). Auth.js v5 offre une intégration native
avec l'App Router (middleware `authorized` callback, Server Actions
`signIn`/`signOut`), un typage de session étendu simple à mettre en place, et
ne nécessite pas d'adapter de base de données puisque les sessions sont en
JWT et les utilisateurs sont gérés directement dans la table `users` du
schéma Drizzle. C'est l'option la plus légère pour ce besoin.

## État actuel

Tous les écrans du cahier des charges sont livrés :

- Référentiels : Fournisseurs, Clients, Articles
- Commandes fournisseur et commandes client
- Factures (avec impression)
- Règlements (encaissements/décaissements) et Caisse (solde + journal des mouvements)
- Statistiques (achats/sorties, ventes, marge, classements) — graphiques via Recharts
- Utilisateurs (CRUD, réservé ADMIN)
- Journal d'activité (consultation, réservé ADMIN)

Chaque Server Action et chaque page vérifie la permission requise côté
serveur via `requirePermission`/`can` ([`src/lib/permissions.ts`](src/lib/permissions.ts)) —
l'affichage conditionnel du menu n'est qu'un confort, jamais la protection
réelle.

### Mise à jour de novembre 2026

Appliquer la migration `0004_conditions_proforma_et_suppression_comptes`
(`npm run db:migrate`) : elle ajoute le délai de livraison et la garantie aux
proformas, et le marqueur de compte supprimé aux utilisateurs.

Compte « superadmin » (rôle ADMIN), créé ou rétabli par :

```bash
SUPERADMIN_PASSWORD="mot-de-passe-fort" npm run db:superadmin
```

(`SUPERADMIN_EMAIL`, par défaut `superadmin@aei.td`, et `SUPERADMIN_NOM` sont
facultatifs.)

- Taux de TVA modifiable à l'émission de chaque facture et proforma (19,25 %
  par défaut, ou le taux commun des articles de la vente).
- Proformas : délai de livraison, garantie, et modification tant qu'elles
  sont en circulation (lignes, TVA, conditions).
- Suppression définitive des factures et proformas annulées, et des comptes
  utilisateurs (conservés en base, masqués, s'ils sont auteurs de pièces).
- Le « bon de commande » est réservé aux achats ; côté ventes, le document
  imprimé est un bon de livraison et le mode de règlement « À crédit ».

Migration `0005_parametres_signature` : table `parametres`, qui conserve la
cachet signé importé depuis la page **Paramètres** (réservée à
l'administrateur) et imprimés dans la zone de signature AEI de tous les PDF.

### Avant une mise en production

- Remplacer les valeurs placeholder de `AEI_INFO` dans
  [`src/lib/constants.ts`](src/lib/constants.ts) (téléphone, email, NIF) par
  les vraies coordonnées de l'entreprise — elles apparaissent sur les
  factures imprimées.
- Changer le mot de passe du compte admin créé par le seed
  (`admin@aei.td` / `admin1234`).

## Variables d'environnement

Copier `.env.example` vers `.env` et renseigner :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion Neon, variante **pooled** (`-pooler`), requise pour un usage compatible avec les fonctions serverless Vercel. |
| `AUTH_SECRET` | Secret Auth.js. Générer avec `npx auth secret` ou `openssl rand -base64 33`. |

## Migrations

```bash
npm install

# Générer les fichiers de migration SQL à partir du schéma Drizzle
npm run db:generate

# Appliquer les migrations à la base Neon
npm run db:migrate

# (alternative en développement : pousser le schéma sans fichier de migration)
npm run db:push

# Peupler la base avec un admin par défaut, des articles, deux fournisseurs
# et trois clients dont un avec NIF
npm run db:seed

# Interface d'administration de la base
npm run db:studio
```

Identifiants créés par le seed : `admin@aei.td` / `admin1234` (à changer
immédiatement en production).

## Développement

```bash
npm run dev
```

## Déploiement Vercel

1. Créer un projet Neon, copier l'URL de connexion **pooled**.
2. Sur Vercel : importer le dépôt, renseigner `DATABASE_URL` et `AUTH_SECRET`
   dans les variables d'environnement du projet (Production + Preview).
3. Lancer les migrations contre la base de production avant le premier
   déploiement : `DATABASE_URL=... npm run db:migrate` (depuis un poste avec
   accès réseau à Neon, ou via une action CI dédiée).
4. Déployer (`vercel --prod` ou déploiement automatique sur push).
5. Exécuter le seed une seule fois en production si un compte admin initial
   est nécessaire, puis changer immédiatement son mot de passe.

## Rôles et permissions

Voir [`src/lib/permissions.ts`](src/lib/permissions.ts) pour la matrice
complète. Règle clé : le superviseur voit l'activité commerciale (montants
des commandes et factures) mais jamais le solde de caisse, les encaissements
clients, ni l'état des impayés — c'est le solde qui est masqué, pas le
chiffre d'affaires facturé. Toute vérification de permission se fait côté
serveur via `requirePermission(session, permission)`, en première ligne de
chaque Server Action.
