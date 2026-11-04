"use client";

import { useState } from "react";
import { Mail, MessageCircle, Share2 } from "lucide-react";
import { notifications } from "@mantine/notifications";
import { Button, Menu } from "@mantine/core";

/**
 * Numéro au format international attendu par WhatsApp (chiffres seuls).
 * Un numéro tchadien local (8 chiffres) reçoit l'indicatif 235.
 */
function numeroWhatsApp(telephone: string | null | undefined): string | null {
  if (!telephone) return null;
  let chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  if (chiffres.length === 8) chiffres = `235${chiffres}`;
  return chiffres.length >= 8 ? chiffres : null;
}

/**
 * Envoi d'un document au tiers (client ou fournisseur).
 *
 * - Sur téléphone, « Partager… » ouvre le partage du système avec le PDF en
 *   pièce jointe : WhatsApp, e-mail, Bluetooth… au choix.
 * - WhatsApp et e-mail ouvrent une conversation pré-remplie avec le numéro ou
 *   l'adresse du tiers. Ni l'un ni l'autre ne permet de joindre un fichier
 *   depuis un lien : le PDF est donc téléchargé en même temps, prêt à être
 *   glissé dans la conversation.
 */
export function PartagerDocument({
  href,
  nomFichier,
  libelleDocument,
  telephone,
  email,
}: {
  /** Route du PDF, ex. `/factures/12/pdf`. */
  href: string;
  nomFichier: string;
  /** Ex. « la facture FAC-2026-0003 ». */
  libelleDocument: string;
  telephone?: string | null;
  email?: string | null;
}) {
  const [enCours, setEnCours] = useState(false);
  const message = `Bonjour, veuillez trouver ci-joint ${libelleDocument}. Cordialement, ABDELDJELIL ETUDE INFORMATIQUE.`;
  const wa = numeroWhatsApp(telephone);

  function telecharger() {
    const a = document.createElement("a");
    a.href = `${href}?telecharger`;
    a.download = `${nomFichier}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function partagerSysteme() {
    setEnCours(true);
    try {
      const reponse = await fetch(href);
      if (!reponse.ok) throw new Error("PDF indisponible");
      const fichier = new File([await reponse.blob()], `${nomFichier}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: libelleDocument, text: message });
      } else {
        telecharger();
        notifications.show({
          message: "Partage direct indisponible sur cet appareil : le PDF a été téléchargé.",
          color: "blue",
        });
      }
    } catch (e) {
      // L'utilisateur qui ferme la fenêtre de partage n'est pas une erreur.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        notifications.show({ message: "Impossible de partager le document.", color: "red" });
      }
    } finally {
      setEnCours(false);
    }
  }

  function viaWhatsApp() {
    telecharger();
    const url = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  }

  function viaEmail() {
    telecharger();
    const sujet = `${libelleDocument.charAt(0).toUpperCase()}${libelleDocument.slice(1)} — AEI`;
    window.location.href = `mailto:${email ?? ""}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(
      `${message}\n\n(Document PDF joint.)`,
    )}`;
  }

  return (
    <Menu position="bottom-end" width={250} shadow="md" withinPortal>
      <Menu.Target>
        <Button variant="default" leftSection={<Share2 size={16} />} loading={enCours}>
          Envoyer
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<Share2 size={16} />} onClick={partagerSysteme}>
          Partager… (téléphone)
        </Menu.Item>
        <Menu.Item leftSection={<MessageCircle size={16} />} onClick={viaWhatsApp}>
          WhatsApp{wa ? "" : " (choisir le contact)"}
        </Menu.Item>
        <Menu.Item leftSection={<Mail size={16} />} onClick={viaEmail}>
          E-mail{email ? "" : " (sans adresse)"}
        </Menu.Item>
        <Menu.Label>Le PDF est téléchargé pour être joint.</Menu.Label>
      </Menu.Dropdown>
    </Menu>
  );
}
