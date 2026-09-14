import "./feuille-a4.css";

/**
 * Enveloppe commune à tous les documents imprimables (factures, bons de
 * commande). Elle porte la géométrie A4 définie dans feuille-a4.css : aucune
 * page ne doit redéfinir sa propre largeur ni ses propres marges, sous peine
 * de voir l'écran et le papier diverger.
 *
 * L'identifiant "feuille-document" est le point d'accroche de l'export PDF
 * (voir apercu-document-dialog).
 */
export function FeuilleA4({
  children,
  barreOutils,
}: {
  children: React.ReactNode;
  barreOutils?: React.ReactNode;
}) {
  return (
    <div className="feuille-apercu">
      <div className="feuille-apercu__colonne">
        {barreOutils && (
          <div className="sans-impression mb-4 flex justify-end">{barreOutils}</div>
        )}
        <div id="feuille-document" className="feuille-a4">
          {children}
        </div>
      </div>
    </div>
  );
}
