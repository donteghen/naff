// Fallback for paths outside the three apps (should not happen: the middleware prefixes every path).
export default function RootNotFound() {
  return (
    <main style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>404</h1>
      <p>Page introuvable · Page not found</p>
      <a href="/">NAFF</a>
    </main>
  );
}
