"use client";

import "./globals.css";

/**
 * Dernier filet : ne se déclenche que si le gabarit racine lui-même échoue.
 * Il doit donc rendre ses propres <html> et <body>, et ne peut s'appuyer sur
 * aucun composant qui dépendrait du gabarit (polices, Toaster, thème).
 */
export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#F4F3F0",
          color: "#1A1917",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "32rem",
            padding: "32px",
            background: "#FFFFFF",
            border: "1px solid #D9D6D0",
            borderRadius: "2px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
            L&apos;application n&apos;a pas pu démarrer
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#4A4844" }}>
            Aucune donnée n&apos;a été modifiée. Rechargez la page ; si le problème
            persiste, prévenez l&apos;administrateur.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "16px",
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
                color: "#6B6862",
              }}
            >
              Référence technique : {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#FFFFFF",
              background: "#1E3A5F",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
