"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center", color: "#0B1B3F" }}>
        <h1>Une erreur est survenue · Something went wrong</h1>
        <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 24px", borderRadius: 16, border: 0, background: "#FFB81C", fontWeight: 800 }}>
          Réessayer · Try again
        </button>
      </body>
    </html>
  );
}
