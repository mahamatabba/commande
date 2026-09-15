"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, ExternalLink, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Aperçu d'un document officiel — facture, proforma, bon de commande.
 *
 * Le document affiché est le PDF définitif, celui-là même que le client
 * recevra : il est composé par le serveur, pas reconstitué par le navigateur.
 * Auparavant l'aperçu montrait une page web et laissait l'utilisateur
 * l'imprimer lui-même ; le fichier obtenu dépendait alors de son navigateur,
 * de ses marges par défaut et de la case « imprimer les fonds ». Deux postes
 * ne produisaient pas le même document.
 *
 * `href` pointe la route PDF (`/factures/12/pdf`). La même route, avec
 * `?telecharger`, renvoie le même fichier en pièce jointe.
 */
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

  useEffect(() => {
    if (defaultOpen) {
      router.replace(pathname, { scroll: false });
    }
    // Nettoyage du "?nouveau=1" une seule fois, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lienTelechargement = `${href}${href.includes("?") ? "&" : "?"}telecharger`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          {/* L'indicateur reste dessous en permanence : la visionneuse PDF du
              navigateur ne prévient pas toujours de sa fin de chargement, et
              un état « chargé » qui n'arrive jamais laisserait un voile sur
              l'aperçu. Le PDF, opaque, le recouvre dès qu'il s'affiche. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="max-w-xs text-xs text-muted-foreground">
              Si le document ne s&apos;affiche pas ici, votre navigateur ne sait pas lire les PDF
              dans une fenêtre. Utilisez « Ouvrir dans un onglet ».
            </p>
          </div>
          {open && (
            <iframe
              src={href}
              title={titre}
              className="absolute inset-0 size-full border-0 bg-white"
            />
          )}
        </div>
        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            Document définitif, prêt à imprimer ou à envoyer au client.
          </p>
          <Button
            variant="outline"
            render={<a href={href} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink />
            Ouvrir dans un onglet
          </Button>
          <Button render={<a href={lienTelechargement} download={`${nomFichier}.pdf`} />}>
            <Download />
            Télécharger le PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
