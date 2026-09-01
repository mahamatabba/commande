import type { Transaction } from "@/db";
import { db } from "@/db";
import { journalActivite } from "@/db/schema";

export type EntiteJournal =
  | "commande_fournisseur"
  | "commande_client"
  | "facture"
  | "reglement"
  | "fournisseur"
  | "client"
  | "article"
  | "utilisateur";

export type ActionJournal =
  | "creation"
  | "modification"
  | "validation"
  | "annulation"
  | "reglement"
  | "connexion";

/**
 * Trace une action dans le journal d'activité (règle métier : toute
 * création, modification, annulation et tout règlement y est tracé).
 * Accepte `tx` pour être appelée à l'intérieur d'une transaction existante,
 * ou `db` directement pour une trace hors transaction (ex : connexion).
 */
export async function tracerActivite(
  executeur: Transaction | typeof db,
  params: {
    userId: number;
    action: ActionJournal;
    entite: EntiteJournal;
    entiteId?: number;
    details?: Record<string, unknown>;
  },
) {
  await executeur.insert(journalActivite).values({
    userId: params.userId,
    action: params.action,
    entite: params.entite,
    entiteId: params.entiteId,
    details: params.details ?? null,
  });
}
