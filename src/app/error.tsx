"use client";

// Shown when a page fails unexpectedly (e.g. the database is unreachable). Bilingual: no translation context here.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-extrabold">Une erreur est survenue · Something went wrong</h1>
      <p className="text-muted">Vérifiez votre connexion puis réessayez. · Check your connection and try again.</p>
      <button type="button" onClick={reset} className="min-h-12 rounded-2xl bg-amber px-6 font-extrabold text-navy">Réessayer · Try again</button>
    </main>
  );
}
