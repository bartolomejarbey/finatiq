"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="cs">
      <body style={{ margin: 0, padding: 0, background: "#060d1a", fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1rem",
          textAlign: "center",
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            fontSize: 28,
          }}>
            ⚠
          </div>
          <h1 style={{
            fontFamily: "Oswald, system-ui, sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#f0f4f8",
            textTransform: "uppercase",
            letterSpacing: 2,
            margin: "0 0 12px",
          }}>
            Kritická chyba
          </h1>
          <p style={{ color: "rgba(240,244,248,0.4)", fontSize: 14, margin: "0 0 8px" }}>
            Aplikace narazila na závažný problém.
          </p>
          {error.digest && (
            <p style={{ color: "rgba(240,244,248,0.2)", fontSize: 12, fontFamily: "monospace", margin: "0 0 24px" }}>
              Kód: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#22d3ee",
              color: "#060d1a",
              border: "none",
              padding: "14px 28px",
              fontFamily: "Oswald, system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 2,
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            Zkusit znovu
          </button>
        </div>
      </body>
    </html>
  );
}
