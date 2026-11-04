"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Download, Eye } from "lucide-react";
import { Alert, Button, Group, Text } from "@mantine/core";
import { ApercuDocumentDialog } from "./apercu-document-dialog";

/**
 * Bandeau affiché juste après une création ou une modification : il
 * confirme l'opération et propose le PDF, sans l'imposer. Auparavant
 * l'aperçu s'ouvrait d'office, ce qui gênait dès qu'on n'avait pas besoin du
 * document tout de suite.
 *
 * Le paramètre d'URL (`?nouveau=1`…) est retiré au montage : recharger la page
 * ou la partager ne réaffiche pas le bandeau.
 */
export function BandeauConfirmation({
  message,
  href,
  titre,
  nomFichier,
}: {
  message: string;
  href: string;
  titre: string;
  nomFichier: string;
}) {
  const [visible, setVisible] = useState(true);

  // Nettoyage de l'URL sans navigation : `router.replace` relancerait le
  // rendu serveur sans le paramètre, et le bandeau disparaîtrait aussitôt.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  if (!visible) return null;

  return (
    <Alert
      color="green"
      variant="light"
      radius="lg"
      icon={<CircleCheck size={20} />}
      withCloseButton
      onClose={() => setVisible(false)}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm" fw={500}>
          {message}
        </Text>
        <Group gap="xs">
          <ApercuDocumentDialog
            href={href}
            titre={titre}
            nomFichier={nomFichier}
            trigger={
              <Button size="xs" color="green" leftSection={<Eye size={14} />}>
                Voir le PDF
              </Button>
            }
          />
          <Button
            size="xs"
            variant="default"
            component="a"
            href={`${href}?telecharger`}
            leftSection={<Download size={14} />}
          >
            Télécharger
          </Button>
        </Group>
      </Group>
    </Alert>
  );
}
