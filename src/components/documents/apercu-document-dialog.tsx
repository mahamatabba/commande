"use client";

import { cloneElement, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, ExternalLink, Eye, Loader2 } from "lucide-react";
import { Button, Group, Modal, Text } from "@mantine/core";

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
  const triggerNode = trigger ?? (
    <Button variant="outline" size="xs" leftSection={<Eye size={14} />}>
      Voir
    </Button>
  );

  return (
    <>
      {cloneElement(triggerNode, { onClick: () => setOpen(true) })}
      <Modal opened={open} onClose={() => setOpen(false)} title={titre} size="xl">
        <div className="relative flex h-[75vh] flex-col overflow-hidden rounded-md border border-[var(--mantine-color-dark-4)] bg-[var(--mantine-color-dark-6)]">
          {/* L'indicateur reste dessous en permanence : la visionneuse PDF du
              navigateur ne prévient pas toujours de sa fin de chargement, et
              un état « chargé » qui n'arrive jamais laisserait un voile sur
              l'aperçu. Le PDF, opaque, le recouvre dès qu'il s'affiche. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Loader2 className="size-6 animate-spin text-[var(--mantine-color-dimmed)]" />
            <Text size="xs" c="dimmed" maw={280}>
              Si le document ne s&apos;affiche pas ici, votre navigateur ne sait pas lire les PDF
              dans une fenêtre. Utilisez « Ouvrir dans un onglet ».
            </Text>
          </div>
          {open && (
            <iframe
              src={href}
              title={titre}
              className="absolute inset-0 size-full border-0 bg-white"
            />
          )}
        </div>
        <Group justify="space-between" mt="md" wrap="wrap">
          <Text size="xs" c="dimmed">
            Document définitif, prêt à imprimer ou à envoyer au client.
          </Text>
          <Group gap="xs">
            <Button
              variant="outline"
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<ExternalLink size={14} />}
            >
              Ouvrir dans un onglet
            </Button>
            <Button
              component="a"
              href={lienTelechargement}
              download={`${nomFichier}.pdf`}
              leftSection={<Download size={14} />}
            >
              Télécharger le PDF
            </Button>
          </Group>
        </Group>
      </Modal>
    </>
  );
}
