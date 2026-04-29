import AppShell from "@/components/dashboard/AppShell";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";
import { useTodayEvents, type TodayEvent } from "@/hooks/useTodayEvents";
import { useYahooQuotes } from "@/hooks/useYahooQuotes";
import { useGoals, type Goal } from "@/hooks/useGoals";

type LegacyGoal = { label: string; done: number; target: number; color: string };

const FALLBACK_GOALS: LegacyGoal[] = [
  { label: "כדורסל", done: 2, target: 3, color: "#34D399" },
  { label: "ליהי",    done: 1, target: 3, color: "#FB7185" },
  { label: "קורס",    done: 2, target: 4, color: "#A78BFA" },
  { label: "טניס",    done: 1, target: 2, color: "#FBBF24" },
];

// Symbols we display on the market card. Live prices + changes come from
// `/api/yahoo/quote`; we only keep metadata here (display name, default
// currency, whether the user owns it).
type MarketSymbol = {
  symbol: string;
  name: string;
  heName: string;
  currency: "USD" | "ILS";
  owned?: boolean;
};
const STOCKS: MarketSymbol[] = [
  { symbol: "VOO",    name: "S&P 500 ETF",  heName: "S&P 500",   currency: "USD", owned: true },
  { symbol: "NVDA",   name: "Nvidia",        heName: "Nvidia",    currency: "USD", owned: true },
  { symbol: "^DJI",   name: "Dow Jones",     heName: "Dow Jones", currency: "USD" },
  { symbol: "^IXIC",  name: "Nasdaq",        heName: "Nasdaq",    currency: "USD" },
];


const ArrowUp = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <path d="M5 1 L9 8 L1 8 Z" />
  </svg>
);
const ArrowDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: "rotate(180deg)" }}>
    <path d="M5 1 L9 8 L1 8 Z" />
  </svg>
);

const Index = () => {
  const goalsQuery = useGoals();
  const liveGoals: Goal[] = goalsQuery.goals.length > 0
    ? goalsQuery.goals
    : FALLBACK_GOALS.map((g, i) => ({ id: `fallback-${i}`, ...g }));
  const goalsDone = liveGoals.filter((g) => g.target > 0 && g.done >= g.target).length;
  const goalsPct = liveGoals.length > 0 ? Math.round((goalsDone / liveGoals.length) * 100) : 0;
  const today = useTodayEvents();
  const todayCount = today.loading || today.isConfigMissing || today.error
    ? "—"
    : today.events.length;

  return (
    <AppShell>
      <h1 className="sr-only">דשבורד benweb</h1>

      <DailyBriefing userName="בן" />

      {/* 3-column bento */}
      <div className="dashboard-grid stage">
        {/* Card: Today's Schedule */}
        <section className="glass grid-today" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
          <div className="card-header">
            <h3 className="card-title">לוז היום</h3>
            <span className="label-cap">{todayCount} אירועים</span>
          </div>
          <TodayCardBody {...today} />
        </section>

        {/* Card: Market Today */}
        <section className="glass grid-metrics" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
          <MarketCard />
        </section>

        {/* Card: Weekly Goals */}
        <section className="glass grid-goals" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
          <div className="card-header">
            <h3 className="card-title">יעדי השבוע</h3>
            <span className="label-cap">{goalsDone}/{liveGoals.length}</span>
          </div>

          {/* Ring */}
          <div className="flex justify-center" style={{ marginTop: 4, marginBottom: 20 }}>
            <Ring pct={goalsPct} />
          </div>

          {/* Goal bars */}
          <div className="flex flex-col gap-3">
            {liveGoals.map((g) => {
              const pct = Math.min((g.done / g.target) * 100, 100);
              const complete = g.done >= g.target;
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      flexShrink: 0,
                      background: complete ? `${g.color}22` : "transparent",
                      border: `1.5px solid ${complete ? g.color : "rgba(255,255,255,0.12)"}`,
                      color: g.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {complete ? "✓" : ""}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: "#F5F6FF" }}>{g.label}</span>
                      <span className="mono" style={{ fontSize: 11, color: "#6B7094" }}>
                        {g.done}/{g.target}
                      </span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: g.color,
                          boxShadow: `0 0 6px ${g.color}`,
                          borderRadius: 999,
                          transition: "width 800ms cubic-bezier(0.16,1,0.3,1)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <style>{`
        .dashboard-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr 1fr; }
          .grid-metrics   { grid-column: 1 / -1; }
        }
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 320px 1fr 320px;
            grid-auto-flow: dense;
          }
          .grid-today     { grid-column: 3; grid-row: 1; }
          .grid-metrics   { grid-column: 2; grid-row: 1; }
          .grid-goals     { grid-column: 1; grid-row: 1; }
        }
      `}</style>
    </AppShell>
  );
};

function MarketCard() {
  const symbols = STOCKS.map((s) => s.symbol);
  const { quotes, isLoading, error } = useYahooQuotes(symbols);

  return (
    <>
      <div className="card-header">
        <div className="flex items-center gap-2">
          <h3 className="card-title">השוק היום</h3>
          <span
            style={{
              fontSize: 10,
              color: "#6B7094",
              padding: "2px 6px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span className="mono">Yahoo Finance</span>
          </span>
        </div>
        <span className="label-cap">
          {isLoading ? "טוען…" : error ? "לא זמין" : "מעודכן · חי"}
        </span>
      </div>

      {/* Tickers */}
      <div className="flex flex-col" style={{ marginBottom: 14 }}>
        {STOCKS.map((meta, i) => {
          const live = quotes[meta.symbol];
          const hasLive = live && live.price != null && live.changePct != null;
          const price = hasLive ? live!.price! : null;
          const changePct = hasLive ? live!.changePct! : null;
          const currency: "USD" | "ILS" =
            live?.currency === "USD" || live?.currency === "ILS" ? live.currency : meta.currency;
          const s = { ...meta, price, changePct, currency };
          const up = (changePct ?? 0) >= 0;
          const color = up ? "#34D399" : "#FB7185";
          const symbolIsIndex = s.symbol.startsWith("^");
          const sign = s.currency === "USD" ? "$" : "₪";
          return (
            <div
              key={s.symbol}
              className="flex items-center gap-4"
              style={{
                padding: "12px 0",
                borderBottom: i === STOCKS.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Right cluster (RTL start): name + symbol */}
              <div className="flex flex-col" style={{ minWidth: 140 }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#F5F6FF" }}>{s.heName}</span>
                  {s.owned && (
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        color: "#A78BFA",
                        background: "rgba(167,139,250,0.14)",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      בתיק
                    </span>
                  )}
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "#6B7094",
                    letterSpacing: 0.02,
                    marginTop: 1,
                  }}
                >
                  {symbolIsIndex ? s.symbol : s.symbol} · {s.name}
                </span>
              </div>

              {/* Sparkline-like bar — only render when there's a live quote.
                  Previously we drew the bar using the hardcoded fallback
                  `changePct`, which made the dashboard look alive when it
                  wasn't. */}
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 999,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {hasLive && changePct !== null && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      insetInlineStart: up ? 0 : "auto",
                      insetInlineEnd: up ? "auto" : 0,
                      width: `${Math.min(Math.abs(changePct) * 30, 100)}%`,
                      background: color,
                      boxShadow: `0 0 6px ${color}`,
                      borderRadius: 999,
                      transition: "width 800ms cubic-bezier(0.16,1,0.3,1)",
                    }}
                  />
                )}
              </div>

              {/* Left cluster (RTL end): price + change */}
              <div className="flex flex-col items-end" style={{ minWidth: 120 }}>
                {hasLive && price !== null && changePct !== null ? (
                  <>
                    <span
                      className="mono currency"
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#F5F6FF",
                      }}
                    >
                      {sign}
                      {price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <div
                      className="flex items-center gap-1"
                      style={{ color, marginTop: 1 }}
                    >
                      {up ? <ArrowUp /> : <ArrowDown />}
                      <span
                        className="mono currency"
                        style={{ fontSize: 11, fontWeight: 600 }}
                      >
                        {up ? "+" : ""}
                        {changePct.toFixed(2)}%
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: "#6B7094" }}
                    >
                      —
                    </span>
                    <span
                      style={{ fontSize: 10, color: "#6B7094", marginTop: 1 }}
                    >
                      אין נתון חי
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </>
  );
}

function TodayCardBody({
  events,
  loading,
  error,
  isConfigMissing,
}: {
  events: TodayEvent[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
}) {
  if (isConfigMissing) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "#B4B8D4", fontSize: 12, lineHeight: 1.6 }}>
        לא הוגדר <code style={{ color: "#A78BFA" }}>VITE_NOTION_SCHEDULE_DB_ID</code>.<br />
        העתק את <code style={{ color: "#A78BFA" }}>.env.example</code> ל-<code style={{ color: "#A78BFA" }}>.env.local</code> ומלא את מזהה ה-database.
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "#FB7185", fontSize: 12 }}>
        שגיאה בטעינת האירועים: {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)",
              backgroundSize: "200% 100%",
              animation: "today-shimmer 1.4s ease-in-out infinite",
            }}
          />
        ))}
        <style>{`@keyframes today-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "#6B7094", fontSize: 12 }}>
        אין אירועים להיום
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {events.map((e) => (
        <div
          key={e.id}
          className="evt-block"
          style={{
            background: e.bg,
            ["--evt-accent" as string]: e.accent,
          } as React.CSSProperties}
        >
          <div className="flex flex-col items-end">
            <span className="evt-title-block">{e.title}</span>
            <span className="evt-time-block mono">{e.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#A78BFA"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: "drop-shadow(0 0 8px rgba(167,139,250,0.6))" }}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ flexDirection: "column" }}
      >
        <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: "#F5F6FF", lineHeight: 1 }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

export default Index;
