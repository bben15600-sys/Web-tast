import { useMemo, useState } from "react";
import type { Holding } from "@/hooks/useInvestments";
import type { YahooQuote } from "@/hooks/useYahooQuotes";
import { useYahooChart, type YahooChartRange } from "@/hooks/useYahooChart";

const RANGES: Array<{ key: YahooChartRange; label: string }> = [
  { key: "1mo", label: "1ח" },
  { key: "3mo", label: "3ח" },
  { key: "6mo", label: "6ח" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1ש" },
  { key: "5y", label: "5ש" },
];

const BENCHMARK_SYMBOL = "VOO";
const BENCHMARK_COLOR = "#60A5FA";
function isBenchmarkItself(symbol: string | undefined | null): boolean {
  if (!symbol) return false;
  const s = symbol.toUpperCase();
  return s === "VOO" || s === "^GSPC" || s === "SPY" || s === "SPX";
}

export function HoldingDetailView({
  holding,
  quote,
  currency,
  usdRate,
  onBack,
  onEdit,
}: {
  holding: Holding;
  quote?: YahooQuote;
  currency: "ILS" | "USD";
  usdRate: number;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [range, setRange] = useState<YahooChartRange>("3mo");
  const [showBenchmark, setShowBenchmark] = useState(true);
  const { data: points, isLoading: chartLoading, error: chartError } = useYahooChart(holding.symbol, range);
  const benchmarkActive = showBenchmark && !isBenchmarkItself(holding.symbol);
  const { data: benchmarkPoints } = useYahooChart(benchmarkActive ? BENCHMARK_SYMBOL : null, range);

  const chartData = points ?? [];
  const benchmarkData = benchmarkPoints ?? [];
  const { holdingPath, benchmarkPath, lastPoint, min, max, first, last, benchmarkChangePct } = useMemo(
    () => buildChartPaths(
      chartData.map((p) => p.close),
      benchmarkActive ? benchmarkData.map((p) => p.close) : [],
      680,
      220,
    ),
    [chartData, benchmarkData, benchmarkActive],
  );
  const chartChange = first != null && last != null ? last - first : null;
  const chartChangePct = chartChange != null && first != null && first !== 0 ? (chartChange / first) * 100 : null;
  const chartUp = chartChange != null && chartChange >= 0;
  const chartColor = chartUp ? "#34D399" : "#FB7185";

  const liveChange = quote?.changePct ?? null;
  const liveColor = liveChange == null ? "#6B7094" : liveChange >= 0 ? "#34D399" : "#FB7185";
  const liveCurrSymbol = quote?.currency === "USD" ? "$" : quote?.currency === "ILS" ? "₪" : "";

  const displayValue = currency === "ILS" ? holding.value : holding.value / usdRate;
  const valueSymbol = currency === "ILS" ? "₪" : "$";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between" style={{ padding: "4px 2px" }}>
        <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#F5F6FF" }}>
          {holding.name}
          {holding.symbol && (
            <span style={{ fontSize: 13, color: "#6B7094", fontWeight: 500, marginInlineStart: 8 }}>
              {holding.symbol}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "rgba(167,139,250,0.14)",
              border: "1px solid rgba(167,139,250,0.30)",
              color: "#A78BFA",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✎ ערוך
          </button>
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה"
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#B4B8D4",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            חזרה
          </button>
        </div>
      </div>

      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div
          className="flex items-start justify-between"
          style={{ gap: 16, flexWrap: "wrap", rowGap: 14 }}
        >
          <div className="flex flex-col" style={{ gap: 4, flex: "1 1 180px", minWidth: 180 }}>
            <span className="label-cap">שווי תיק</span>
            <span className="mono currency" style={{ fontSize: 28, fontWeight: 700, color: "#F5F6FF", lineHeight: 1.1 }}>
              {valueSymbol}{Math.round(displayValue).toLocaleString()}
            </span>
            <span className="mono currency" style={{ fontSize: 11, color: "#6B7094" }}>
              {holding.alloc.toFixed(0)}% מהתיק
            </span>
            <span
              className="mono currency"
              style={{ fontSize: 11, color: holding.changeColor, fontWeight: 600 }}
            >
              תשואה {holding.changePct > 0 ? "+" : ""}{holding.changePct.toFixed(2)}%
              <span style={{ color: "#6B7094", fontWeight: 400 }}>  Notion</span>
            </span>
          </div>
          {quote && quote.price != null ? (
            <div
              className="flex flex-col items-end"
              style={{ gap: 4, flex: "1 1 140px", minWidth: 140 }}
            >
              <span className="label-cap">מחיר חי</span>
              <span
                className="mono currency"
                style={{ fontSize: 22, fontWeight: 700, color: liveColor, lineHeight: 1.1 }}
              >
                {liveCurrSymbol}{quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="mono currency" style={{ fontSize: 11, color: liveColor, fontWeight: 600 }}>
                {liveChange != null && (<>היום {liveChange > 0 ? "+" : ""}{liveChange.toFixed(2)}%</>)}
              </span>
              {quote.marketState && (
                <span style={{ fontSize: 10, color: "#6B7094" }}>
                  {formatMarketStateHebrew(quote.marketState)}
                </span>
              )}
            </div>
          ) : holding.symbol ? (
            <div
              className="flex flex-col items-end"
              style={{ gap: 4, flex: "1 1 140px", minWidth: 140 }}
            >
              <span className="label-cap">מחיר חי</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "#6B7094" }}>
                לא זמין
              </span>
              <span style={{ fontSize: 10, color: "#6B7094" }}>
                {holding.symbol}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
            {chartChangePct != null && (
              <span
                className="mono currency"
                style={{
                  fontSize: 12,
                  color: chartColor,
                  padding: "3px 10px",
                  background: chartUp ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)",
                  borderRadius: 999,
                }}
              >
                {chartUp ? "+" : ""}{chartChangePct.toFixed(2)}% בטווח
              </span>
            )}
            {benchmarkActive && benchmarkChangePct != null && (
              <span
                className="mono currency"
                style={{
                  fontSize: 11,
                  color: BENCHMARK_COLOR,
                  padding: "3px 10px",
                  background: "rgba(96,165,250,0.10)",
                  border: "1px solid rgba(96,165,250,0.24)",
                  borderRadius: 999,
                }}
              >
                S&P {benchmarkChangePct >= 0 ? "+" : ""}{benchmarkChangePct.toFixed(2)}%
              </span>
            )}
            {!isBenchmarkItself(holding.symbol) && (
              <button
                type="button"
                onClick={() => setShowBenchmark((v) => !v)}
                style={{
                  padding: "3px 10px",
                  fontSize: 10,
                  color: showBenchmark ? BENCHMARK_COLOR : "#6B7094",
                  background: "transparent",
                  border: `1px solid ${showBenchmark ? "rgba(96,165,250,0.28)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 999,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {showBenchmark ? "הסתר S&P" : "השווה ל-S&P"}
              </button>
            )}
            {chartLoading && <span style={{ fontSize: 10, color: "#6B7094" }}>טוען גרף…</span>}
            {chartError && <span style={{ fontSize: 10, color: "#FB7185" }}>גרף לא זמין כרגע</span>}
          </div>
          <div
            role="tablist"
            className="flex items-center gap-1"
            style={{
              padding: 3,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999,
              direction: "ltr",
            }}
          >
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={range === r.key}
                onClick={() => setRange(r.key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: range === r.key ? "rgba(255,255,255,0.10)" : "transparent",
                  color: range === r.key ? "#F5F6FF" : "#6B7094",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length >= 2 ? (
          <svg width="100%" height="220" viewBox="0 0 680 220" preserveAspectRatio="none" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            {holdingPath && (
              <>
                <path d={`${holdingPath} L 680 220 L 0 220 Z`} fill="url(#chart-fill)" />
                {benchmarkPath && (
                  <path
                    d={benchmarkPath}
                    fill="none"
                    stroke={BENCHMARK_COLOR}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="4 3"
                    opacity={0.75}
                  />
                )}
                <path d={holdingPath} fill="none" stroke={chartColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                {lastPoint && (
                  <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3.5" fill={chartColor} style={{ filter: `drop-shadow(0 0 6px ${chartColor})` }} />
                )}
              </>
            )}
          </svg>
        ) : (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#6B7094", fontSize: 12 }}>
            {chartLoading ? "טוען..." : "אין נתוני גרף לטווח זה"}
          </div>
        )}

        {min != null && max != null && (
          <div className="flex items-center justify-between" style={{ marginTop: 10, fontSize: 11, color: "#6B7094" }}>
            <span className="mono">מינימום {min.toFixed(2)}</span>
            <span className="mono">מקסימום {max.toFixed(2)}</span>
          </div>
        )}
      </section>
    </div>
  );
}

function formatMarketStateHebrew(state: string): string {
  switch (state) {
    case "REGULAR":  return "שוק פתוח";
    case "PRE":      return "טרום-מסחר";
    case "POST":
    case "POSTPOST": return "אחרי מסחר";
    case "CLOSED":   return "שוק סגור";
    default:         return state;
  }
}

function buildChartPaths(holding: number[], benchmark: number[], w: number, h: number) {
  const empty = {
    holdingPath: null as string | null,
    benchmarkPath: null as string | null,
    lastPoint: null as [number, number] | null,
    min: null as number | null,
    max: null as number | null,
    first: null as number | null,
    last: null as number | null,
    benchmarkChangePct: null as number | null,
  };
  if (holding.length < 2) return empty;

  const holdingBase = holding[0];
  const holdingRatios = holding.map((v) => v / holdingBase);
  const hasBench = benchmark.length >= 2;
  const benchmarkBase = hasBench ? benchmark[0] : 1;
  const benchmarkRatios = hasBench ? benchmark.map((v) => v / benchmarkBase) : [];

  const combined = hasBench ? [...holdingRatios, ...benchmarkRatios] : holdingRatios;
  const minRatio = Math.min(...combined);
  const maxRatio = Math.max(...combined);
  const range = maxRatio - minRatio || 1;

  const mapY = (ratio: number) => h - ((ratio - minRatio) / range) * (h - 8) - 4;
  const buildSmooth = (ratios: number[]): { path: string; pts: Array<[number, number]> } => {
    const stepX = w / (ratios.length - 1);
    const pts: Array<[number, number]> = ratios.map((r, i) => [i * stepX, mapY(r)]);
    let path = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      const cx = (x1 + x2) / 2;
      path += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    }
    return { path, pts };
  };

  const holdingBuilt = buildSmooth(holdingRatios);
  const benchmarkBuilt = hasBench ? buildSmooth(benchmarkRatios) : null;
  const benchmarkChangePct = hasBench
    ? (benchmarkRatios[benchmarkRatios.length - 1] - 1) * 100
    : null;

  return {
    holdingPath: holdingBuilt.path,
    benchmarkPath: benchmarkBuilt?.path ?? null,
    lastPoint: holdingBuilt.pts[holdingBuilt.pts.length - 1],
    min: Math.min(...holding),
    max: Math.max(...holding),
    first: holding[0],
    last: holding[holding.length - 1],
    benchmarkChangePct,
  };
}
