import { useMemo, useState } from "react";
import AppShell from "@/components/dashboard/AppShell";
import { useMonthlyHistory, type MonthSnapshot } from "@/hooks/useMonthlyHistory";
import { useInvestments } from "@/hooks/useInvestments";

const NetWorth = () => {
  const [monthsBack, setMonthsBack] = useState<6 | 12>(6);
  const { snapshots, isLoading: historyLoading, error: historyError } = useMonthlyHistory(monthsBack);
  const investments = useInvestments();
  const portfolio = investments.data?.total ?? 0;

  const cumulativeSavings = useMemo(() => accumulate(snapshots.map((s) => s.savings)), [snapshots]);
  const cumulativeNet = useMemo(() => accumulate(snapshots.map((s) => s.net)), [snapshots]);

  const avgSavings = snapshots.length > 0
    ? snapshots.reduce((sum, s) => sum + s.savings, 0) / snapshots.length
    : 0;
  const bestMonth = snapshots.length > 0 ? snapshots.reduce((a, b) => (b.savings > a.savings ? b : a)) : null;
  const worstMonth = snapshots.length > 0 ? snapshots.reduce((a, b) => (b.savings < a.savings ? b : a)) : null;
  const totalSaved = cumulativeSavings.length > 0 ? cumulativeSavings[cumulativeSavings.length - 1] : 0;

  return (
    <AppShell>
      <h1 className="sr-only">שווי נטו</h1>

      <div className="flex flex-col gap-5">
        <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
          <div className="card-header">
            <div className="flex flex-col gap-1">
              <h2 className="card-title">שווי נטו משוער</h2>
              <span style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>
                השקעות + חיסכון מצטבר מהחודשים האחרונים
              </span>
            </div>
            <div
              role="tablist"
              className="flex items-center gap-1"
              style={{
                padding: 3,
                background: "var(--oslife-chip)",
                border: "1px solid var(--oslife-chip-border)",
                borderRadius: 999,
              }}
            >
              {[6, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="tab"
                  aria-selected={monthsBack === n}
                  onClick={() => setMonthsBack(n as 6 | 12)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    border: "none",
                    background: monthsBack === n ? "rgba(255,255,255,0.10)" : "transparent",
                    color: monthsBack === n ? "var(--oslife-text-strong)" : "var(--oslife-text-mute)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {n} חודשים
                </button>
              ))}
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 18 }}
          >
            <KpiTile
              label="שווי נטו משוער"
              value={`₪${Math.round(portfolio + totalSaved).toLocaleString()}`}
              color="#F5F6FF"
              emphasize
            />
            <KpiTile
              label="תיק השקעות"
              value={`₪${Math.round(portfolio).toLocaleString()}`}
              color="#A78BFA"
            />
            <KpiTile
              label={`חיסכון ב-${monthsBack} חודשים`}
              value={`${totalSaved >= 0 ? "+" : ""}₪${Math.round(totalSaved).toLocaleString()}`}
              color={totalSaved >= 0 ? "#34D399" : "#FB7185"}
            />
            <KpiTile
              label="ממוצע חודשי"
              value={`₪${Math.round(avgSavings).toLocaleString()}`}
              color="#60A5FA"
            />
          </div>

          {historyError && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                background: "rgba(251,113,133,0.08)",
                border: "1px solid rgba(251,113,133,0.28)",
                borderRadius: 8,
                color: "#FB7185",
                fontSize: 12,
              }}
            >
              ⚠️ סנכרון היסטוריית תקציב נכשל: {historyError}
            </div>
          )}

          {historyLoading && snapshots.every((s) => s.income === 0 && s.expense === 0) ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 13 }}>
              טוען היסטוריה של {monthsBack} חודשים...
            </div>
          ) : (
            <NetWorthChart
              snapshots={snapshots}
              cumulativeSavings={cumulativeSavings}
              cumulativeNet={cumulativeNet}
              portfolio={portfolio}
            />
          )}
        </section>

        <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
          <div className="card-header">
            <h2 className="card-title">פירוט לפי חודש</h2>
            <span className="label-cap">{snapshots.length} חודשים</span>
          </div>
          <MonthlyBreakdown snapshots={snapshots} bestMonth={bestMonth} worstMonth={worstMonth} />
        </section>
      </div>
    </AppShell>
  );
};

function accumulate(values: number[]): number[] {
  let sum = 0;
  return values.map((v) => (sum += v));
}

function NetWorthChart({
  snapshots,
  cumulativeSavings,
  cumulativeNet,
  portfolio,
}: {
  snapshots: MonthSnapshot[];
  cumulativeSavings: number[];
  cumulativeNet: number[];
  portfolio: number;
}) {
  const w = 680;
  const h = 220;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 26;

  // The main series we plot is the estimated net-worth trajectory:
  // portfolio + cumulative savings at each month. Portfolio is constant
  // (we don't have historical snapshots), so the shape is the cumulative
  // savings curve offset up by the current portfolio value.
  const series = cumulativeSavings.map((v) => portfolio + v);
  const netSeries = cumulativeNet.map((v) => portfolio + v);

  const allValues = [...series, ...netSeries, portfolio];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const stepX = snapshots.length > 1 ? innerW / (snapshots.length - 1) : 0;

  const xAt = (i: number) => padL + i * stepX;
  const yAt = (v: number) => padT + innerH - ((v - min) / range) * innerH;

  const pathFor = (vals: number[]): string => {
    if (vals.length < 2) return "";
    const pts = vals.map((v, i) => [xAt(i), yAt(v)] as [number, number]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      const cx = (x1 + x2) / 2;
      d += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    }
    return d;
  };

  const path = pathFor(series);
  const netPath = pathFor(netSeries);

  if (snapshots.length < 2) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 13 }}>
        צריך לפחות 2 חודשי היסטוריה כדי לצייר גרף
      </div>
    );
  }

  const firstValue = series[0];
  const lastValue = series[series.length - 1];
  const totalChange = lastValue - firstValue;
  const totalChangePct = firstValue !== 0 ? (totalChange / firstValue) * 100 : 0;
  const up = totalChange >= 0;
  const mainColor = up ? "#34D399" : "#FB7185";

  return (
    <div>
      <div className="flex items-center gap-2" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        <span
          className="mono currency"
          style={{
            fontSize: 12,
            color: mainColor,
            padding: "3px 10px",
            background: up ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)",
            borderRadius: 999,
            fontWeight: 600,
          }}
        >
          {up ? "+" : ""}
          ₪{Math.round(totalChange).toLocaleString()}
          {" · "}
          {up ? "+" : ""}
          {totalChangePct.toFixed(1)}%
        </span>
        <span style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>בטווח</span>
      </div>

      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mainColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={mainColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines + y-axis labels at min / mid / max */}
        {[0, 0.5, 1].map((p) => {
          const y = padT + innerH * (1 - p);
          const v = min + range * p;
          return (
            <g key={p}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 3}
                fill="var(--oslife-text-mute)"
                fontSize="10"
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
              >
                ₪{Math.round(v / 1000)}k
              </text>
            </g>
          );
        })}

        {/* Portfolio baseline */}
        <line
          x1={padL}
          x2={w - padR}
          y1={yAt(portfolio)}
          y2={yAt(portfolio)}
          stroke="#A78BFA"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity={0.5}
        />

        {/* "Net" (income - expense cumulative) as a lighter reference */}
        {netPath && (
          <path d={netPath} fill="none" stroke="#60A5FA" strokeWidth="1.2" strokeDasharray="3 3" opacity={0.6} />
        )}

        {path && (
          <>
            <path d={`${path} L ${xAt(snapshots.length - 1)} ${padT + innerH} L ${padL} ${padT + innerH} Z`} fill="url(#nw-fill)" />
            <path d={path} fill="none" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Month labels on x-axis */}
        {snapshots.map((s, i) => (
          <text
            key={s.label}
            x={xAt(i)}
            y={h - 8}
            fill="var(--oslife-text-mute)"
            fontSize="10"
            textAnchor="middle"
          >
            {shortenLabel(s.label)}
          </text>
        ))}

        {/* Last-point dot */}
        <circle
          cx={xAt(snapshots.length - 1)}
          cy={yAt(lastValue)}
          r="3.5"
          fill={mainColor}
          style={{ filter: `drop-shadow(0 0 6px ${mainColor})` }}
        />
      </svg>

      <div className="flex items-center gap-4" style={{ marginTop: 10, flexWrap: "wrap", fontSize: 10, color: "var(--oslife-text-mute)" }}>
        <LegendSwatch color={mainColor} label="שווי נטו משוער" />
        <LegendSwatch color="#60A5FA" label="חיסכון נטו מצטבר" dashed />
        <LegendSwatch color="#A78BFA" label="תיק השקעות (בסיס)" dashed />
      </div>
    </div>
  );
}

function LegendSwatch({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 2,
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)`
            : color,
          borderRadius: 1,
        }}
      />
      {label}
    </span>
  );
}

function KpiTile({
  label,
  value,
  color,
  emphasize,
}: {
  label: string;
  value: string;
  color: string;
  emphasize?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: emphasize ? "rgba(167,139,250,0.08)" : "rgba(10,12,28,0.45)",
        border: `1px solid ${emphasize ? "rgba(167,139,250,0.24)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <span className="label-cap" style={{ display: "block", marginBottom: 4 }}>{label}</span>
      <span
        className="mono currency"
        style={{ fontSize: emphasize ? 22 : 17, fontWeight: 700, color }}
      >
        {value}
      </span>
    </div>
  );
}

function MonthlyBreakdown({
  snapshots,
  bestMonth,
  worstMonth,
}: {
  snapshots: MonthSnapshot[];
  bestMonth: MonthSnapshot | null;
  worstMonth: MonthSnapshot | null;
}) {
  if (snapshots.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 12 }}>
        אין נתונים
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {snapshots.slice().reverse().map((s) => {
        const isBest = bestMonth?.offset === s.offset && s.savings > 0;
        const isWorst = worstMonth?.offset === s.offset && s.savings < 0;
        const color = s.savings >= 0 ? "#34D399" : "#FB7185";
        return (
          <div
            key={s.offset}
            className="flex items-center gap-3"
            style={{
              padding: "10px 12px",
              background: "rgba(10,12,28,0.45)",
              border: `1px solid ${
                isBest
                  ? "rgba(52,211,153,0.28)"
                  : isWorst
                    ? "rgba(251,113,133,0.28)"
                    : "rgba(255,255,255,0.06)"
              }`,
              borderRadius: 10,
            }}
          >
            <div className="flex flex-col" style={{ minWidth: 90 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--oslife-text-strong)" }}>
                {s.label}
              </span>
              {(isBest || isWorst) && (
                <span style={{ fontSize: 10, color: isBest ? "#34D399" : "#FB7185", marginTop: 2 }}>
                  {isBest ? "הכי טוב" : "הכי חלש"}
                </span>
              )}
            </div>
            <div
              className="flex flex-col flex-1 gap-1"
              style={{ minWidth: 0 }}
            >
              <div
                style={{
                  height: 6,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 999,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${Math.min((s.income / Math.max(s.income, s.expense, 1)) * 100, 100)}%`,
                    height: "100%",
                    background: "rgba(52,211,153,0.6)",
                  }}
                />
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
                    width: `${Math.min((s.expense / Math.max(s.income, s.expense, 1)) * 100, 100)}%`,
                    height: "100%",
                    background: "rgba(251,113,133,0.6)",
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col items-end" style={{ minWidth: 100 }}>
              <span className="mono currency" style={{ fontSize: 13, fontWeight: 700, color }}>
                {s.savings >= 0 ? "+" : ""}
                ₪{Math.round(s.savings).toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: "var(--oslife-text-mute)", marginTop: 2 }}>
                חיסכון
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function shortenLabel(label: string): string {
  // "אפריל 2026" → "אפר׳ 26"
  const parts = label.split(" ");
  if (parts.length !== 2) return label;
  const [month, year] = parts;
  const shortMonth = month.slice(0, 3) + "׳";
  const shortYear = year.slice(-2);
  return `${shortMonth} ${shortYear}`;
}

export default NetWorth;
