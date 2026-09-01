"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, Eye, Loader2, Printer } from "lucide-react";
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
  const [telechargement, setTelechargement] = useState(false);
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

  function imprimer() {
    iframeRef.current?.contentWindow?.print();
  }

  async function telecharger() {
    const documentIframe = iframeRef.current?.contentDocument;
    const feuille = documentIframe?.getElementById("feuille-document");
    if (!feuille) return;

    setTelechargement(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(feuille, { scale: 2, useCORS: true });
      const image = canvas.toDataURL("image/png");

      const LARGEUR_A4_MM = 210;
      const HAUTEUR_A4_MM = 297;
      const hauteurImage = (canvas.height * LARGEUR_A4_MM) / canvas.width;

      // Si le document tient sur une page, on crée une page à la taille exacte
      // du contenu pour éviter un grand espace blanc sous le pied de page.
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: hauteurImage <= HAUTEUR_A4_MM ? [LARGEUR_A4_MM, hauteurImage] : "a4",
      });
      const largeurPage = pdf.internal.pageSize.getWidth();
      const hauteurPage = pdf.internal.pageSize.getHeight();

      let hauteurRestante = hauteurImage;
      let position = 0;

      pdf.addImage(image, "PNG", 0, position, largeurPage, hauteurImage);
      hauteurRestante -= hauteurPage;

      while (hauteurRestante > 0) {
        position = hauteurRestante - hauteurImage;
        pdf.addPage();
        pdf.addImage(image, "PNG", 0, position, largeurPage, hauteurImage);
        hauteurRestante -= hauteurPage;
      }

      pdf.save(`${nomFichier}.pdf`);
    } finally {
      setTelechargement(false);
    }
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
        <DialogFooter>
          <Button variant="outline" onClick={imprimer} disabled={!charge}>
            <Printer />
            Imprimer
          </Button>
          <Button onClick={telecharger} disabled={!charge || telechargement}>
            {telechargement ? <Loader2 className="animate-spin" /> : <Download />}
            Télécharger le PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
