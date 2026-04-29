import { useHealthInsight, type HealthInsightContext } from "@/hooks/useHealthInsight";

export function HealthInsight({ context }: { context: HealthInsightContext }) {
  const { insight, isLoading, error } = useHealthInsight(context);

  return (
    <section
      className="glass"
      style={{
        padding: 20,
        borderColor: "rgba(52,211,153,0.2)",
        background: "rgba(52,211,153,0.03)",
      }}
    >
      <div className="card-header" style={{ marginBottom: 10 }}>
        <h3 className="card-title">✨ תובנת בריאות</h3>
        <span className="label-cap" style={{ color: "rgba(52,211,153,0.5)" }}>Claude AI</span>
      </div>

      {isLoading && (
        <p style={{ fontSize: 13, color: "var(--oslife-text-mute)", fontStyle: "italic" }}>
          מנתח את נתוני הבריאות שלך…
        </p>
      )}

      {error && (
        <p style={{ fontSize: 12, color: "#FB7185" }}>
          ⚠️ {error}
        </p>
      )}

      {insight && (
        <p
          style={{
            fontSize: 13.5,
            color: "var(--oslife-text-mid)",
            lineHeight: 1.75,
            fontFamily: "'Frank Ruhl Libre', 'Fraunces', Georgia, serif",
          }}
        >
          {insight}
        </p>
      )}

      {!isLoading && !error && !insight && (
        <p style={{ fontSize: 12, color: "var(--oslife-text-mute)" }}>
          הוסף נתוני פעילות, שינה ומשקל כדי לקבל תובנה יומית.
        </p>
      )}
    </section>
  );
}
