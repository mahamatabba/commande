import { FileSpreadsheet } from "lucide-react";
import { Button } from "@mantine/core";
import type { ParamsListe } from "@/lib/filtres";

/**
 * Téléchargement de la liste au format tableur (ouvrable dans Excel), avec
 * les filtres en cours (statut, période) mais sans pagination : toutes les
 * lignes correspondantes.
 */
export function BoutonExport({ href, params }: { href: string; params: ParamsListe }) {
  const recherche = new URLSearchParams();
  for (const cle of ["statut", "du", "au"]) {
    const v = params[cle];
    if (typeof v === "string" && v) recherche.set(cle, v);
  }
  const qs = recherche.toString();
  return (
    <Button
      component="a"
      href={qs ? `${href}?${qs}` : href}
      variant="light"
      color="green"
      leftSection={<FileSpreadsheet size={16} />}
      ml="auto"
    >
      Exporter (Excel)
    </Button>
  );
}
