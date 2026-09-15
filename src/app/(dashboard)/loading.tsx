import { SqueletteListe } from "@/components/shared/squelettes";

/**
 * Filet de sécurité : tout segment du tableau de bord qui n'a pas sa propre
 * silhouette hérite de celle-ci. Sa seule présence suffit à rendre chaque lien
 * préchargeable, donc chaque clic immédiat.
 */
export default function Chargement() {
  return <SqueletteListe colonnes={5} lignes={8} />;
}
