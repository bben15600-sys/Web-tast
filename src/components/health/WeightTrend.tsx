import { useMemo, useState } from "react";
import { useWeight, setWeightGoal } from "@/hooks/useWeight";
import { computeWeightTrend, projectGoalEta } from "@/lib/healthStats";

export function WeightTrend() {
  const weight = useWeight();
  const [showLogInput, setShowLogInput] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [newKg, setNewKg] = useState("");
  const [newGoal, setNewGoal] = useState(weight.goal != null ? String(weight.goal) : "");

  const trend = useMemo(
    () => computeWeightTrend(weight.entries, weight.goal),
    [weight.entries, weight.goal],
  );
  const eta = useMemo(() => projectGoalEta(trend, 30), [trend]);

  const sparkline = useMemo(() => buildSparkline(weight.entries.map((e) => e.kg)), [weight.entries]);

  const onLog = async () => {
    const kg = Number(newKg);
    if (!Number.isFinite(kg) || kg <= 0) return;
    await weight.addEntry({ date: new Date().toISOString().slice(0, 10), kg });
    setNewKg("");
    setShowLogInput(false);
  };

  const onSetGoal = () => {
    const goal = newGoal.trim() === "" ? null : Number(newGoal);
    if (goal != null && (!Number.isFinite(goal) || goal <= 0)) return;
    setWeightGoal(goal);
    setShowGoalInput(false);
    window.location.reload();
  };

  return (
    <section className="glass" style={{ padding: 20 }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <h3 className="card-title">מגמת משקל</h3>
        <span className="label-cap">{weight.entries.length} ימים</span>
      </div>

      {weight.isConfigMissing && (
        <div style={configStyle}>
          ⚙️ נתוני משקל דוגמה. הוסף <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>VITE_NOTION_WEIGHT_DB_ID</code>.
        </div>
      )}
      {weight.error && <div style={errorStyle}>⚠️ {weight.error}</div>}

      <div style={{ height: 96, position: "relative", marginBottom: 8 }}>
        <svg width="100%" height="100%" viewBox="0 0 300 90" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
            </linearGradient>
          </defs>
          {sparkline.areaPath && (
            <path d={sparkline.areaPath} fill="url(#wGrad)" />
          )}
          {sparkline.linePath && (
            <path
              d={sparkline.linePath}
              fill="none"
              stroke="#60A5FA"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {trend.goal != null && sparkline.goalY != null && (
            <line
              x1="0"
              y1={sparkline.goalY}
              x2="300"
              y2={sparkline.goalY}
              stroke="rgba(52,211,153,0.4)"
              strokeWidth="1"
              strokeDasharray="6,4"
            />
          )}
          {sparkline.lastPoint && (
            <circle cx={sparkline.lastPoint.x} cy={sparkline.lastPoint.y} r="3.5" fill="#60A5FA" />
          )}
        </svg>
      </div>

      {weight.entries.length >= 2 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--oslife-text-mute)", marginBottom: 12 }}>
          <span>{new Date(weight.entries[0].date).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
          <span>{new Date(weight.entries[weight.entries.length - 1].date).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <StatCard label="עכשיו" value={trend.current != null ? `${trend.current}` : "—"} suffix="ק״ג" color="#60A5FA" />
        <StatCard label="יעד" value={trend.goal != null ? `${trend.goal}` : "—"} suffix="ק״ג" color="#34D399" onClick={() => setShowGoalInput(true)} />
        {trend.remaining != null && (
          <StatCard
            label="נותר"
            value={`${trend.remaining > 0 ? "−" : "+"}${Math.abs(trend.remaining).toFixed(1)}`}
            suffix="ק״ג"
            color={trend.remaining > 0 ? "#FB7185" : "#34D399"}
          />
        )}
      </div>

      {trend.monthChange != null && eta.weeksToGoal != null && eta.reachable && eta.weeksToGoal > 0 && (
        <div style={insightStyle}>
          📉 בקצב הנוכחי תגיע ליעד תוך כ-{eta.weeksToGoal} שבועות
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {!showLogInput ? (
          <button type="button" onClick={() => setShowLogInput(true)} disabled={weight.isSample} style={primaryBtnStyle}>
            + רשום משקל
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            <input
              type="number"
              step="0.1"
              value={newKg}
              onChange={(e) => setNewKg(e.target.value)}
              placeholder="78.5"
              autoFocus
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" disabled={weight.isMutating} onClick={onLog} style={primaryBtnStyle}>שמור</button>
            <button type="button" onClick={() => setShowLogInput(false)} style={navBtnStyle}>בטל</button>
          </div>
        )}
        {!showLogInput && !showGoalInput && (
          <button type="button" onClick={() => setShowGoalInput(true)} style={navBtnStyle}>קבע יעד</button>
        )}
      </div>

      {showGoalInput && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            type="number"
            step="0.1"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="76"
            autoFocus
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={onSetGoal} style={primaryBtnStyle}>שמור יעד</button>
          <button type="button" onClick={() => setShowGoalInput(false)} style={navBtnStyle}>בטל</button>
        </div>
      )}

      <WeightHistory />
    </section>
  );
}

function WeightHistory() {
  const weight = useWeight();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKg, setEditKg] = useState("");
  const [editDate, setEditDate] = useState("");
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () => [...weight.entries].sort((a, b) => b.date.localeCompare(a.date)),
    [weight.entries],
  );
  const visible = expanded ? sorted : sorted.slice(0, 5);

  const startEdit = (entry: { id: string; kg: number; date: string }) => {
    setEditingId(entry.id);
    setEditKg(String(entry.kg));
    setEditDate(entry.date);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const kg = Number(editKg);
    if (!Number.isFinite(kg) || kg <= 0) return;
    await weight.updateEntry(editingId, { date: editDate, kg });
    setEditingId(null);
  };

  if (sorted.length === 0) return null;

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--oslife-chip-border)" }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--oslife-text-mute)",
        letterSpacing: "0.05em", marginBottom: 8, display: "flex", justifyContent: "space-between",
      }}>
        <span>היסטוריית רישומים</span>
        <span style={{ fontWeight: 500 }}>{sorted.length} סך הכל</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {visible.map((entry) => {
          const isEditing = editingId === entry.id;
          const dateLabel = new Date(entry.date).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "2-digit" });
          if (isEditing) {
            return (
              <div key={entry.id} style={historyRowEditStyle}>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{ ...inputStyle, fontSize: 11.5, padding: "5px 8px", minWidth: 110 }}
                />
                <input
                  type="number"
                  step="0.1"
                  value={editKg}
                  onChange={(e) => setEditKg(e.target.value)}
                  autoFocus
                  style={{ ...inputStyle, fontSize: 11.5, padding: "5px 8px", width: 70 }}
                />
                <button type="button" onClick={saveEdit} disabled={weight.isMutating} style={smallBtnSuccessStyle}>✓</button>
                <button type="button" onClick={() => setEditingId(null)} style={smallBtnStyle}>✕</button>
              </div>
            );
          }
          return (
            <div key={entry.id} style={historyRowStyle}>
              <span style={{ fontSize: 11.5, color: "var(--oslife-text-mute)", flex: 1 }}>{dateLabel}</span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "var(--oslife-text-strong)" }}>
                {entry.kg.toFixed(1)} ק״ג
              </span>
              <button
                type="button"
                onClick={() => startEdit(entry)}
                disabled={weight.isSample}
                style={smallBtnStyle}
                aria-label="ערוך"
                title="ערוך"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`למחוק את הרישום מ-${dateLabel}?`)) {
                    await weight.removeEntry(entry.id);
                  }
                }}
                disabled={weight.isSample || weight.isMutating}
                style={{ ...smallBtnStyle, color: "#FB7185" }}
                aria-label="מחק"
                title="מחק"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {sorted.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 8, padding: "6px 0", width: "100%",
            background: "transparent", border: "none",
            color: "var(--oslife-text-mute)", fontSize: 11,
            cursor: "pointer", fontFamily: "inherit",
            textDecoration: "underline",
          }}
        >
          {expanded ? "הצג פחות" : `הצג עוד (${sorted.length - 5})`}
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, suffix, color, onClick }: { label: string; value: string; suffix?: string; color: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--oslife-chip-border)",
        borderRadius: 10,
        padding: 10,
        textAlign: "center",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--oslife-text-mute)", marginTop: 2 }}>{label}{suffix ? ` (${suffix})` : ""}</div>
    </button>
  );
}

type Sparkline = {
  linePath: string;
  areaPath: string;
  lastPoint: { x: number; y: number } | null;
  goalY: number | null;
};

function buildSparkline(values: number[]): Sparkline {
  if (values.length === 0) return { linePath: "", areaPath: "", lastPoint: null, goalY: null };
  if (values.length === 1) {
    return {
      linePath: `M0,45 L300,45`,
      areaPath: "",
      lastPoint: { x: 300, y: 45 },
      goalY: null,
    };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.5);
  const W = 300;
  const H = 80;
  const PAD = 5;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - PAD * 2) - PAD;
    return { x, y };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `${linePath} L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;
  return { linePath, areaPath, lastPoint: points[points.length - 1], goalY: null };
}

const navBtnStyle: React.CSSProperties = {
  padding: "7px 13px",
  borderRadius: 9,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--oslife-text-mid)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const primaryBtnStyle: React.CSSProperties = {
  ...navBtnStyle,
  background: "rgba(96,165,250,0.14)",
  border: "1px solid rgba(96,165,250,0.32)",
  color: "#60A5FA",
};
const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--oslife-chip)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-strong)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};
const configStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 11,
  color: "#FBBF24",
  background: "rgba(251,191,36,0.08)",
  border: "1px solid rgba(251,191,36,0.26)",
  borderRadius: 8,
  marginBottom: 12,
};
const errorStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  color: "#FB7185",
  background: "rgba(251,113,133,0.08)",
  border: "1px solid rgba(251,113,133,0.28)",
  borderRadius: 8,
  marginBottom: 12,
};
const insightStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(96,165,250,0.06)",
  border: "1px solid rgba(96,165,250,0.18)",
  fontSize: 11.5,
  color: "var(--oslife-text-mute)",
};
const historyRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid var(--oslife-chip-border)",
};
const historyRowEditStyle: React.CSSProperties = {
  ...historyRowStyle,
  background: "rgba(96,165,250,0.06)",
  borderColor: "rgba(96,165,250,0.28)",
  flexWrap: "wrap",
};
const smallBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-mute)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  fontSize: 11,
  fontFamily: "inherit",
};
const smallBtnSuccessStyle: React.CSSProperties = {
  ...smallBtnStyle,
  background: "rgba(52,211,153,0.14)",
  borderColor: "rgba(52,211,153,0.32)",
  color: "#34D399",
  fontWeight: 700,
};
