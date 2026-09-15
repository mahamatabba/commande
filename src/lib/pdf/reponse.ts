import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";

/**
 * Outils communs aux quatre routes qui servent un PDF.
 *
 * Elles ont toutes la même forme : lire l'identifiant, vérifier la
 * permission, charger le document, le composer, le renvoyer. Ce qui varie
 * tient dans le composant ; tout le reste est ici.
 */

/**
 * Identifiant de l'URL, ou `null` s'il n'en est pas un.
 *
 * `Number("12abc")` vaut `NaN`, mais `Number("")` vaut `0` et
 * `Number(" 12 ")` vaut 12 : sans contrôle explicite, une URL malformée
 * partait chercher le document n° 0 en base.
 */
export function lireId(valeur: string): number | null {
  if (!/^\d+$/.test(valeur)) return null;
  const id = Number(valeur);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Nettoie un nom de fichier destiné à l'en-tête `Content-Disposition`.
 *
 * Un numéro de document vient de la base : il n'est pas censé contenir de
 * guillemet ni de retour à la ligne, mais un en-tête HTTP mal formé casse la
 * réponse entière, et il n'y a aucune raison de confier l'intégrité du
 * protocole à une donnée saisie.
 *
 * La décomposition NFD sépare les accents de leur lettre ; le filtre ASCII
 * qui suit les retire sans toucher à la lettre. Sans elle, « é » disparaîtrait
 * entièrement du nom du fichier.
 */
export function nomFichierSur(nom: string): string {
  return (
    nom
      .normalize("NFD")
      .replace(/[^\x20-\x7E]+/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "document"
  );
}

/** Réponse HTTP « accès refusé », en texte : la route ne rend pas de page. */
export function accesRefuse(): Response {
  return new Response("Accès refusé.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Réponse HTTP « document introuvable ». */
export function introuvable(): Response {
  return new Response("Document introuvable.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** `?telecharger` demande l'enregistrement plutôt que l'affichage. */
export function veutTelecharger(url: string): boolean {
  return new URL(url).searchParams.get("telecharger") !== null;
}

/**
 * Compose le document et le renvoie.
 *
 * `inline` affiche le PDF dans l'aperçu, `attachment` déclenche
 * l'enregistrement : c'est le seul écart entre « voir » et « télécharger »,
 * le fichier servi étant rigoureusement le même.
 *
 * Le cache est interdit de bout en bout. Un document commercial nominatif ne
 * doit rester ni dans un proxy ni dans le cache du navigateur, où la session
 * suivante sur le même poste pourrait le rouvrir sans être authentifiée.
 */
export async function reponsePdf(
  document: React.ReactElement<DocumentProps>,
  { nomFichier, telecharger }: { nomFichier: string; telecharger: boolean },
): Promise<Response> {
  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(document);
  } catch (erreur) {
    // Le rendu s'appuie sur des dépendances natives (WebAssembly, métriques
    // de polices) dont le comportement en environnement serverless peut
    // différer du poste de développement. Sans ce filet, l'exception remonte
    // telle quelle et Next.js répond par un 500 générique sans aucun détail
    // exploitable — impossible à diagnostiquer depuis l'extérieur.
    console.error("Échec du rendu PDF :", erreur);
    const detail =
      erreur instanceof Error
        ? `${erreur.name}: ${erreur.message}${erreur.stack ? `\n\n${erreur.stack}` : ""}`
        : String(erreur);
    return new Response(`Échec de la génération du PDF.\n\n${detail}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const octets = new Uint8Array(buffer);
  const fichier = `${nomFichierSur(nomFichier)}.pdf`;

  return new Response(octets, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(octets.byteLength),
      "Content-Disposition": `${telecharger ? "attachment" : "inline"}; filename="${fichier}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
