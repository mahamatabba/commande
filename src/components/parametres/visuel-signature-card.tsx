"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { notifications } from "@mantine/notifications";
import { Button, Card, Group, Stack, Text } from "@mantine/core";
import { enregistrerVisuel, supprimerVisuel } from "@/app/(dashboard)/parametres/actions";
import type { EtatFormulaire } from "@/lib/action-state";

const TAILLE_MAX = 600 * 1024;

/**
 * Import du cachet signé : le fichier est lu dans le
 * navigateur, prévisualisé sur fond blanc — comme sur le papier — puis envoyé
 * au serveur sous forme de data URI.
 */
export function VisuelSignatureCard({
  cle,
  titre,
  description,
  imageActuelle,
}: {
  cle: "cachet";
  titre: string;
  description: string;
  imageActuelle: string | null;
}) {
  const initial: EtatFormulaire = { error: null, success: false };
  const [etatEnvoi, envoyer, envoiEnCours] = useActionState(enregistrerVisuel, initial);
  const [etatRetrait, retirer, retraitEnCours] = useActionState(supprimerVisuel.bind(null, cle), initial);
  const [apercu, setApercu] = useState<string | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (etatEnvoi.success) {
      setApercu(null);
      notifications.show({ message: `${titre} enregistré`, color: "green" });
    }
  }, [etatEnvoi, titre]);

  useEffect(() => {
    if (etatRetrait.success) notifications.show({ message: `${titre} retiré`, color: "green" });
  }, [etatRetrait, titre]);

  function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    setErreurFichier(null);
    if (!fichier) return;
    if (!["image/png", "image/jpeg"].includes(fichier.type)) {
      setErreurFichier("Choisissez une image PNG ou JPEG.");
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      setErreurFichier("Image trop lourde : 600 Ko maximum.");
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => setApercu(String(lecteur.result));
    lecteur.readAsDataURL(fichier);
  }

  const affichee = apercu ?? imageActuelle;
  const erreur = erreurFichier ?? etatEnvoi.error ?? etatRetrait.error;

  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="md">
        <div>
          <Text fw={700}>{titre}</Text>
          <Text size="sm" c="dimmed">{description}</Text>
        </div>

        <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-[var(--aei-bordure-forte)] bg-white p-3">
          {affichee ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={affichee} alt={titre} className="max-h-full max-w-full object-contain" />
          ) : (
            <Text size="sm" c="gray.6">Aucune image</Text>
          )}
        </div>

        {apercu && <Text size="xs" c="yellow.4">Aperçu — pas encore enregistré.</Text>}
        {erreur && <Text size="sm" c="red">{erreur}</Text>}

        <input
          ref={champFichier}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          aria-label={`Fichier ${titre}`}
          onChange={choisirFichier}
        />

        <Group gap="sm" wrap="wrap">
          {apercu ? (
            <>
              <form action={envoyer}>
                <input type="hidden" name="cle" value={cle} />
                <input type="hidden" name="image" value={apercu} />
                <Button type="submit" loading={envoiEnCours}>Enregistrer</Button>
              </form>
              <Button variant="default" onClick={() => setApercu(null)}>Annuler</Button>
            </>
          ) : (
            <Button variant="light" leftSection={<ImageUp size={16} />} onClick={() => champFichier.current?.click()}>
              {imageActuelle ? "Remplacer l'image" : "Importer une image"}
            </Button>
          )}
          {imageActuelle && !apercu && (
            <form action={retirer}>
              <Button type="submit" variant="subtle" color="red" leftSection={<Trash2 size={16} />} loading={retraitEnCours}>
                Retirer
              </Button>
            </form>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
