import { useEffect, useState } from "react";
import type { BudgetData } from "@/hooks/useBudgetData";

const TARGET_KEY = "oslife.budget.savingsTarget.v1";
const DEFAULT_TARGET_PCT = 20;

export function SavingsCard({ data }: { data: BudgetData }) {
  const [target, setTarget] = useState<number>(DEFAULT_TARGET_PCT);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(DEFAULT_TARGET_PCT));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TARGET_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0 && n <= 100) {
          setTarget(n);
          setDraft(String(n));
        }
      }
    } catch { /* noop */ }
  }, []);

  const save = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      setEditing(false);
      return;
    }
    setTarget(n);
    try { localStorage.setItem(TARGET_KEY, String(n)); } catch { /* noop */ }
    setEditing(false);
  };

  const { income, expense, savings } = data.totals;
  const net = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const targetAmount = income > 0 ? (income * target) / 100 : 0;
  const towardTarget = targetAmount > 0 ? Math.min((savings / targetAmount) * 100, 100) : 0;
  const onTrack = savingsRate >= target;

  const netColor = net >= 0 ? "#34D399" : "#FB7185";
  const rateColor = onTrack ? "#34D399" : savingsRate >= target * 0.6 ? "#FBBF24" : "#FB7185";

  return (
    <section className="glass" style={{ ["--i" as string]: 1.3 } as React.CSSProperties}>
      <div className="card-header">
        <div className="flex items-center gap-2">
          <h3 className="card-title">יעד חיסכון</h3>
          <span
            style={{
              fontSize: 10,
              color: onTrack ? "#34D399" : "#FBBF24",
              padding: "2px 8px",
              borderRadius: 999,
              background: onTrack ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)",
              border: `1px solid ${onTrack ? "rgba(52,211,153,0.28)" : "rgba(251,191,36,0.28)"}`,
            }}
          >
            {onTrack ? "ביעד" : "מתחת ליעד"}
          </span>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => { setDraft(String(target)); setEditing(true); }}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              color: "var(--oslife-text-mute)",
              background: "transparent",
              border: "1px solid var(--oslife-chip-border)",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            יעד: {target}%
          </button>
        ) : (
          <div className="flex items-center gap-1" style={{ direction: "ltr" }}>
            <input
              type="number"
              min={1}
              max={100}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); else if (e.key === "Escape") setEditing(false); }}
              style={{
                width: 56,
                padding: "4px 8px",
                fontSize: 12,
                background: "rgba(10,12,28,0.55)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--oslife-text-strong)",
                borderRadius: 6,
                outline: "none",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={save}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                color: "#34D399",
                background: "rgba(52,211,153,0.12)",
                border: "1px solid rgba(52,211,153,0.28)",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              שמור
            </button>
          </div>
        )}
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
      >
        <KpiTile label="שיעור חיסכון" value={`${savingsRate.toFixed(1)}%`} color={rateColor} />
        <KpiTile label="נטו החודש" value={`${net >= 0 ? "+" : ""}₪${Math.round(Math.abs(net)).toLocaleString()}`} color={netColor} />
        <KpiTile label="חסכון בפועל" value={`₪${Math.round(savings).toLocaleString()}`} color="#60A5FA" />
        <KpiTile label={`יעד (${target}%)`} value={`₪${Math.round(targetAmount).toLocaleString()}`} color="var(--oslife-text-mid)" muted />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span className="label-cap">התקדמות ליעד</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--oslife-text-mid)" }}>
            {towardTarget.toFixed(0)}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${towardTarget}%`,
              height: "100%",
              background: rateColor,
              boxShadow: `0 0 8px ${rateColor}`,
              borderRadius: 999,
              transition: "width 900ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function KpiTile({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: string;
  color: string;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: muted ? "transparent" : "rgba(10,12,28,0.45)",
        border: `1px solid ${muted ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <span className="label-cap" style={{ display: "block", marginBottom: 4 }}>{label}</span>
      <span
        className="mono currency"
        style={{ fontSize: 18, fontWeight: 700, color }}
      >
        {value}
      </span>
    </div>
  );
}
