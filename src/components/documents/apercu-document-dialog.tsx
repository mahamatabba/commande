"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ApercuDocumentDialog({
  href,
  titre,
  nomFichier,
  trigger,
  defaultOpen = false,
}: {
  href: string;
  titre: string;
  nomFichier: string;
  trigger?: React.ReactElement;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
  const [charge, setCharge] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (defaultOpen) {
      router.replace(pathname, { scroll: false });
    }
    // Nettoyage du "?nouveau=1" une seule fois, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function surChangementOuverture(prochain: boolean) {
    setOpen(prochain);
    if (!prochain) setCharge(false);
  }

  /**
   * L'impression passe par le moteur du navigateur plutôt que par une capture
   * d'image : le PDF obtenu via « Enregistrer au format PDF » reste vectoriel,
   * son texte est sélectionnable et recherchable, et la police ne bave pas à
   * l'agrandissement — ce qu'aucune capture ne peut offrir.
   *
   * Le nom de fichier proposé par la boîte de dialogue est le titre du
   * document imprimé : on lui donne le nom métier le temps de l'impression,
   * puis on le rend, pour que l'aperçu conserve son propre titre.
   */
  function imprimer() {
    const fenetre = iframeRef.current?.contentWindow;
    const documentIframe = iframeRef.current?.contentDocument;
    if (!fenetre || !documentIframe) return;

    const titreOrigine = documentIframe.title;
    documentIframe.title = nomFichier;
    const restaurer = () => {
      documentIframe.title = titreOrigine;
      fenetre.removeEventListener("afterprint", restaurer);
    };
    fenetre.addEventListener("afterprint", restaurer);

    // Sans ce focus, Firefox imprime la page porteuse et non l'aperçu.
    fenetre.focus();
    fenetre.print();
  }

  return (
    <Dialog open={open} onOpenChange={surChangementOuverture}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <Eye />
              Voir
            </Button>
          )
        }
      />
      <DialogContent className="flex h-[85vh] w-full max-w-4xl flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 overflow-hidden rounded-[2px] border border-border bg-muted/30">
          {!charge && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {open && (
            <iframe
              ref={iframeRef}
              src={href}
              title={titre}
              onLoad={() => setCharge(true)}
              className="absolute inset-0 size-full border-0 bg-white"
            />
          )}
        </div>
        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            Pour obtenir un fichier PDF, choisissez «&nbsp;Enregistrer au format PDF&nbsp;» comme
            destination dans la fenêtre d&apos;impression.
          </p>
          <Button onClick={imprimer} disabled={!charge}>
            <Printer />
            Imprimer ou enregistrer en PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
