import { useStrava } from "@/hooks/useStrava";

export function StravaConnect() {
  const strava = useStrava();

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 11, color: "var(--oslife-text-mute)", marginBottom: 8 }}>חיבורים</div>

      {strava.connected ? (
        <div style={connectedRowStyle}>
          <span style={{ fontSize: 20 }}>🚴</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--oslife-text-strong)" }}>Strava</div>
            <div style={{ fontSize: 10, color: "#FC4C02" }}>● מחובר — {strava.activities.length} פעילויות אחרונות</div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("לנתק את החיבור ל-Strava?")) {
                void strava.disconnect();
              }
            }}
            style={disconnectBtnStyle}
          >
            ניתוק
          </button>
        </div>
      ) : (
        <a href={strava.connectUrl} style={connectBtnStyle}>
          <span style={{ fontSize: 18 }}>🚴</span>
          <span>חבר חשבון Strava</span>
        </a>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  marginTop: 10,
  paddingTop: 12,
  borderTop: "1px solid var(--oslife-chip-border)",
};
const connectedRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(252,76,2,0.06)",
  border: "1px solid rgba(252,76,2,0.2)",
};
const disconnectBtnStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 7,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--oslife-text-mute)",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
};
const connectBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  borderRadius: 10,
  background: "#FC4C02",
  color: "white",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  width: "fit-content",
};
