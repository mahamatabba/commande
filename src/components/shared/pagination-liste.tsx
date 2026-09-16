import Link from "next/link";
import { Button, Group, Text } from "@mantine/core";
import { lienPagination, type ParamsListe } from "@/lib/filtres";

/**
 * Pied d'une liste paginée.
 *
 * Les liens passent par `lienPagination`, qui réécrit tous les filtres
 * courants — voir le commentaire de cette fonction pour la raison.
 *
 * Les bornes ne sont pas des liens morts : sur la première page, « Précédent »
 * est un vrai bouton désactivé, pas une ancre qui mènerait à `page=0`.
 */
export function PaginationListe({
  base,
  params,
  page,
  nbPages,
  total,
  nom,
  nomPluriel,
}: {
  /** Chemin de la liste, sans paramètres (ex. `/factures`). */
  base: string;
  params: ParamsListe;
  page: number;
  nbPages: number;
  total: number;
  /** Nom de l'élément compté, au singulier (ex. « facture »). */
  nom: string;
  /** Pluriel, si l'ajout d'un « s » ne convient pas. */
  nomPluriel?: string;
}) {
  if (nbPages <= 1) return null;

  const pluriel = nomPluriel ?? `${nom}s`;

  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Text size="sm" c="dimmed">
        Page {page} sur {nbPages} · {total} {total > 1 ? pluriel : nom}
      </Text>
      <Group gap="xs">
        {page > 1 ? (
          <Button variant="outline" size="sm" component={Link} href={lienPagination(base, params, page - 1)}>
            Précédent
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Précédent
          </Button>
        )}
        {page < nbPages ? (
          <Button variant="outline" size="sm" component={Link} href={lienPagination(base, params, page + 1)}>
            Suivant
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Suivant
          </Button>
        )}
      </Group>
    </Group>
  );
}
