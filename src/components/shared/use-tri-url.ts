"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DataTableSortStatus } from "mantine-datatable";

/**
 * État de tri d'un tableau, synchronisé avec l'URL : cliquer un en-tête
 * réécrit `tri`/`ordre` et revient en première page ; le serveur renvoie la
 * liste triée. Le lien reste partageable et le bouton « retour » fonctionne.
 */
export function useTriUrl<T>(courant: { colonne: string; ordre: "asc" | "desc" }) {
  const router = useRouter();
  const pathname = usePathname();
  const recherche = useSearchParams();

  const sortStatus: DataTableSortStatus<T> = {
    columnAccessor: courant.colonne,
    direction: courant.ordre,
  };

  function onSortStatusChange(statut: DataTableSortStatus<T>) {
    const params = new URLSearchParams(recherche.toString());
    params.set("tri", String(statut.columnAccessor));
    params.set("ordre", statut.direction);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { sortStatus, onSortStatusChange };
}
