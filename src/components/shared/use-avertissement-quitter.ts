"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGE = "Des modifications n'ont pas été enregistrées. Quitter quand même cette page ?";

/**
 * Prévient avant de quitter un formulaire modifié et non enregistré :
 * fermeture ou rechargement de l'onglet (alerte du navigateur), mais aussi
 * clic sur un lien de l'application — Next.js ne propose pas de blocage de
 * navigation, on intercepte donc les clics sur les liens internes.
 *
 * Usage : `onChange={marquerModifie}` sur le `<form>` (les événements de
 * saisie remontent jusqu'à lui) et `onSubmit={liberer}` pour ne pas alerter
 * au moment de l'enregistrement.
 */
export function useAvertissementQuitter() {
  const [modifie, setModifie] = useState(false);
  const modifieRef = useRef(false);
  modifieRef.current = modifie;

  useEffect(() => {
    function avantDechargement(e: BeforeUnloadEvent) {
      if (!modifieRef.current) return;
      e.preventDefault();
      e.returnValue = MESSAGE;
    }
    function surClic(e: MouseEvent) {
      if (!modifieRef.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as HTMLElement | null)?.closest("a");
      if (!lien || lien.target === "_blank" || lien.hasAttribute("download")) return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", avantDechargement);
    document.addEventListener("click", surClic, true);
    return () => {
      window.removeEventListener("beforeunload", avantDechargement);
      document.removeEventListener("click", surClic, true);
    };
  }, []);

  return {
    marquerModifie: () => setModifie(true),
    liberer: () => setModifie(false),
  };
}
