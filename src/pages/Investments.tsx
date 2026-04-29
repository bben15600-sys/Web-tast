import { useEffect, useState } from "react";
import AppShell from "@/components/dashboard/AppShell";
import { useInvestments, type Holding, type InvestmentsView } from "@/hooks/useInvestments";
import { useYahooQuotes, type YahooQuote } from "@/hooks/useYahooQuotes";
import { useYahooChart } from "@/hooks/useYahooChart";
import { useFxRate } from "@/hooks/useFxRate";
import { HoldingFormModal } from "@/components/investments/HoldingFormModal";
import { HoldingDetailView } from "@/components/investments/HoldingDetailView";

const FALLBACK_USD_RATE = 3.65; // used only if /api/fx fails entirely
type Currency = "ILS" | "USD";
type HoldingModalState = { mode: "create" } | { mode: "edit"; holding: Holding } | null;

function buildPath(data: number[], w: number, h: number) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [i * stepX, h - ((v - min) / range) * (h - 4) - 2] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const cx = (x1 + x2) / 2;
    d += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }
  return { d, last: pts[pts.length - 1] };
}

const Sparkline = ({ data, color, w = 100, h = 32 }: { data: number[]; color: string; w?: number; h?: number }) => {
  if (data.length < 2) return null;
  const { d, last } = buildPath(data, w, h);
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
};

const Investments = () => {
  const { data, isLoading, isError, error, databaseId } = useInvestments();
  const [modal, setModal] = useState<HoldingModalState>(null);
  const [currency, setCurrency] = useState<Currency>("ILS");
  const [detailHoldingId, setDetailHoldingId] = useState<string | null>(null);

  const symbols = data?.holdings.map((h) => h.symbol).filter((s): s is string => Boolean(s)) ?? [];
  const { quotes: topQuotes } = useYahooQuotes(symbols);
  const { rate: topFxRate } = useFxRate("USD", "ILS");
  const topUsdRate = topFxRate ?? FALLBACK_USD_RATE;

  const detailHolding = data?.holdings.find((h) => h.id === detailHoldingId) ?? null;

  return (
    <AppShell>
      <h1 className="sr-only">תיק השקעות</h1>

      <div className="flex flex-col gap-5">
        {!databaseId ? (
          <ConfigMissing />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />
        ) : isLoading || !data ? (
          <LoadingState />
        ) : detailHolding ? (
          <HoldingDetailView
            holding={detailHolding}
            quote={detailHolding.symbol ? topQuotes[detailHolding.symbol] : undefined}
            currency={currency}
            usdRate={topUsdRate}
            onBack={() => setDetailHoldingId(null)}
            onEdit={() => setModal({ mode: "edit", holding: detailHolding })}
          />
        ) : (
          <PortfolioView
            view={data}
            currency={currency}
            onToggleCurrency={() => setCurrency((c) => (c === "ILS" ? "USD" : "ILS"))}
            onAdd={() => setModal({ mode: "create" })}
            onEdit={(holding) => setModal({ mode: "edit", holding })}
            onOpenDetail={(holding) => setDetailHoldingId(holding.id)}
          />
        )}
      </div>

      {modal && (
        <HoldingFormModal
          mode={modal.mode}
          initial={"holding" in modal ? modal.holding : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </AppShell>
  );
};

type OpenEdit = (h: Holding) => void;

function PortfolioView({
  view,
  currency,
  onToggleCurrency,
  onAdd,
  onEdit,
  onOpenDetail,
}: {
  view: InvestmentsView;
  currency: Currency;
  onToggleCurrency: () => void;
  onAdd: () => void;
  onEdit: OpenEdit;
  onOpenDetail: (holding: Holding) => void;
}) {
  const { holdings, total } = view;

  const symbols = holdings.map((h) => h.symbol).filter((s): s is string => Boolean(s));
  const { quotes, errors: liveErrors, isLoading: liveLoading, error: liveError } = useYahooQuotes(symbols);
  const errorBySymbol = new Map(liveErrors.map((e) => [e.symbol, e.message]));

  const { rate: liveFxRate, source: fxSource } = useFxRate("USD", "ILS");
  const usdRate = liveFxRate ?? FALLBACK_USD_RATE;

  // Hero headline change uses the Notion-recorded % — this reflects the
  // user's tracked return (YTD / since-purchase / whatever they chose).
  const notionChangePct = view.totalChangePct;
  const changeColor = notionChangePct > 0 ? "#34D399" : notionChangePct < 0 ? "#FB7185" : "#A78BFA";
  const changeBg =
    notionChangePct > 0 ? "rgba(52,211,153,0.12)"
    : notionChangePct < 0 ? "rgba(251,113,133,0.12)"
    : "rgba(167,139,250,0.12)";

  // Live market change today — weighted by value, for rows that have a live quote.
  const hasLiveTotal = holdings.some((h) => h.symbol && quotes[h.symbol]?.changePct != null);
  const dailyMarketChange = (() => {
    if (!hasLiveTotal || total <= 0) return null;
    let covered = 0;
    let weighted = 0;
    for (const h of holdings) {
      const live = h.symbol ? quotes[h.symbol] : undefined;
      if (live?.changePct != null) {
        weighted += h.value * live.changePct;
        covered += h.value;
      }
    }
    return covered > 0 ? weighted / covered : null;
  })();

  const displayTotal = currency === "ILS" ? total : total / usdRate;
  const altTotal = currency === "ILS" ? total / usdRate : total * usdRate;
  const mainSymbol = currency === "ILS" ? "₪" : "$";
  const altSymbol = currency === "ILS" ? "$" : "₪";

  return (
    <>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={onToggleCurrency}
            style={currencyToggleStyle}
            aria-label="החלף מטבע"
          >
            הצג ב-{currency === "ILS" ? "$" : "₪"}
          </button>
          <button
            type="button"
            onClick={onAdd}
            style={{
              padding: "6px 12px", borderRadius: 10,
              background: "rgba(52,211,153,0.14)",
              border: "1px solid rgba(52,211,153,0.30)",
              color: "#34D399", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            + החזקה
          </button>
        </div>
        <div className="flex flex-col items-center gap-2 text-center" style={{ padding: "12px 0" }}>
          <span className="label-cap">שווי תיק כולל</span>
          <div className="mono glow-mint currency" style={{ fontSize: 56, fontWeight: 700 }}>
            {mainSymbol}{Math.round(displayTotal).toLocaleString()}
          </div>
          <div className="mono currency" style={{ fontSize: 16, color: "#B4B8D4" }}>
            ≈ {altSymbol}{Math.round(altTotal).toLocaleString()}
          </div>
          <div className="flex items-center gap-2" style={{ marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span className="mono currency" style={{
              fontSize: 13, color: changeColor,
              padding: "3px 10px", background: changeBg, borderRadius: 999,
            }}>
              {notionChangePct > 0 ? "+" : ""}{notionChangePct.toFixed(2)}%
            </span>
            <span style={{ fontSize: 12, color: "#6B7094" }}>תשואה (Notion)</span>
            {dailyMarketChange != null && (
              <span
                className="mono currency"
                style={{
                  fontSize: 11,
                  color: dailyMarketChange >= 0 ? "#34D399" : "#FB7185",
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: dailyMarketChange >= 0 ? "rgba(52,211,153,0.08)" : "rgba(251,113,133,0.08)",
                  border: `1px solid ${dailyMarketChange >= 0 ? "rgba(52,211,153,0.20)" : "rgba(251,113,133,0.20)"}`,
                }}
              >
                היום {dailyMarketChange > 0 ? "+" : ""}{dailyMarketChange.toFixed(2)}% · שוק
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                color: "#34D399",
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.20)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title={`USD/ILS ${usdRate.toFixed(3)} · מקור: ${fxSource ?? "cached"}`}
            >
              <span style={{
                width: 6, height: 6, borderRadius: 999,
                background: "#34D399",
                boxShadow: "0 0 6px #34D399",
              }} />
              USD/ILS {usdRate.toFixed(3)}
            </span>
          </div>
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">החזקות</h2>
          <div className="flex items-center gap-2">
            {liveLoading && <span style={{ fontSize: 10, color: "#6B7094" }}>טוען מחירים...</span>}
            {liveError && (
              <span
                style={{
                  fontSize: 10,
                  color: "#FB7185",
                  maxWidth: 260,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  direction: "ltr",
                }}
                title={liveError}
              >
                ⚠️ {liveError}
              </span>
            )}
            <span className="label-cap">{holdings.length} נכסים</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {holdings.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "24px 0" }}>
              אין החזקות — לחץ "+ החזקה" למעלה להתחיל
            </div>
          ) : (
            holdings.map((h) => (
              <HoldingRow
                key={h.id}
                h={h}
                quote={h.symbol ? quotes[h.symbol] : undefined}
                liveError={h.symbol ? errorBySymbol.get(h.symbol) ?? null : null}
                currency={currency}
                usdRate={usdRate}
                onEdit={() => onEdit(h)}
                onOpenDetail={() => onOpenDetail(h)}
              />
            ))
          )}
        </div>
      </section>

      <MonthlyDepositSection />
    </>
  );
}

function HoldingRow({
  h,
  quote,
  liveError,
  currency,
  usdRate,
  onEdit,
  onOpenDetail,
}: {
  h: Holding;
  quote?: YahooQuote;
  liveError?: string | null;
  currency: Currency;
  usdRate: number;
  onEdit: () => void;
  onOpenDetail: () => void;
}) {
  const chartRange = "3mo";
  const { data: chartPoints } = useYahooChart(h.symbol, chartRange);
  const realCloses = chartPoints?.map((p) => p.close) ?? null;
  const sparkData = realCloses && realCloses.length >= 2 ? realCloses : h.data;

  const liveChange = quote?.changePct ?? null;
  const liveChangeColor = liveChange == null ? "#6B7094"
    : liveChange > 0 ? "#34D399"
    : liveChange < 0 ? "#FB7185"
    : "#A78BFA";
  const liveCurrSymbol = quote?.currency === "USD" ? "$" : quote?.currency === "ILS" ? "₪" : "";

  const displayValue = currency === "ILS" ? h.value : h.value / usdRate;
  const valueSymbol = currency === "ILS" ? "₪" : "$";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className="holding-row"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 6px",
        background: "transparent",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        width: "100%",
        textAlign: "start",
        fontFamily: "inherit",
      }}
    >
      {/* Row 1: name + symbol chip + edit button pinned to the end */}
      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#F5F6FF",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {h.name}
        </span>
        {h.symbol && (
          <span className="mono" style={{
            fontSize: 10, color: "#6B7094",
            padding: "1px 6px", background: "rgba(255,255,255,0.04)",
            borderRadius: 4,
            flexShrink: 0,
          }}>{h.symbol}</span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label="ערוך החזקה"
          title="ערוך"
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "rgba(167,139,250,0.10)",
            border: "1px solid rgba(167,139,250,0.24)",
            color: "#A78BFA",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
      </div>

      {/* Row 2: value + sparkline on the same axis, plus allocation % */}
      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
        <div className="flex flex-col" style={{ flexShrink: 0 }}>
          <span className="mono currency" style={{ fontSize: 17, fontWeight: 700, color: "#F5F6FF", lineHeight: 1.1 }}>
            {valueSymbol}{Math.round(displayValue).toLocaleString()}
          </span>
          <span style={{ fontSize: 10, color: "#6B7094", marginTop: 1 }}>{h.alloc.toFixed(0)}% מהתיק</span>
        </div>
        <div className="flex-1 flex items-center justify-start" style={{ minWidth: 0, overflow: "hidden" }}>
          <Sparkline data={sparkData} color={h.spark} />
        </div>
      </div>

      {/* Row 3: compact Notion + Live change labels */}
      <div className="flex items-center gap-x-3 gap-y-1" style={{ flexWrap: "wrap" }}>
        <span className="mono currency" style={{ fontSize: 11, color: h.changeColor, fontWeight: 600 }}>
          תשואה {h.changePct > 0 ? "+" : ""}{h.changePct.toFixed(2)}%
          <span style={{ color: "#6B7094", fontWeight: 400 }}>  Notion</span>
        </span>
        {quote && quote.price != null ? (
          <span className="mono currency" style={{ fontSize: 11, color: liveChangeColor, fontWeight: 600 }}>
            {liveCurrSymbol}{quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {liveChange != null && <>  {liveChange > 0 ? "+" : ""}{liveChange.toFixed(2)}%</>}
            <span style={{ color: "#6B7094", fontWeight: 400 }}>  חי</span>
          </span>
        ) : h.symbol && liveError ? (
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: "#FB7185",
              direction: "ltr",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 240,
            }}
            title={liveError}
          >
            ⚠️ {liveError.slice(0, 40)}
          </span>
        ) : null}
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          width: `${h.alloc}%`, height: "100%",
          background: h.spark,
          boxShadow: `0 0 6px ${h.spark}`,
          borderRadius: 999,
          transition: "width 800ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <style>{`
        .holding-row { transition: background 120ms; }
        .holding-row:hover { background: rgba(255,255,255,0.04); }
      `}</style>
    </div>
  );
}

// ── Monthly Deposit (editable, localStorage-backed) ──────────────────────────
type Deposit = { amount: number; target: string; nextDate: string };
const DEPOSIT_KEY = "oslife.investments.monthlyDeposit.v1";
const DEFAULT_DEPOSIT: Deposit = {
  amount: 1500,
  target: "S&P 500 (70%) + NVDA (30%)",
  nextDate: "2026-05-01",
};

function MonthlyDepositSection() {
  const [deposit, setDeposit] = useState<Deposit>(DEFAULT_DEPOSIT);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Deposit>(DEFAULT_DEPOSIT);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEPOSIT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Deposit>;
        const merged = { ...DEFAULT_DEPOSIT, ...parsed };
        setDeposit(merged);
        setForm(merged);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "JSON לא תקין";
      setLoadError(`נתוני הפקדה קיימים לא נטענו (${msg}). יוצג ערך ברירת מחדל.`);
    }
  }, []);

  const save = () => {
    // Validate before persisting. An amount of 0 or a non-finite value is
    // almost always a typo — better to surface it than silently save.
    if (!Number.isFinite(form.amount) || form.amount <= 0) {
      setSaveError("סכום חייב להיות מספר חיובי");
      return;
    }
    if (!form.target.trim()) {
      setSaveError("יעד לא יכול להיות ריק");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.nextDate)) {
      setSaveError("תאריך הפקדה חייב להיות תקין");
      return;
    }
    try {
      localStorage.setItem(DEPOSIT_KEY, JSON.stringify(form));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      setSaveError(`שמירה מקומית נכשלה: ${msg}`);
      return;
    }
    setSaveError(null);
    setDeposit(form);
    setEditing(false);
  };

  return (
    <section className="glass" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
      <div className="card-header">
        <h2 className="card-title">הפקדה חודשית</h2>
        <div className="flex items-center gap-2">
          <span className="label-cap">שמור מקומית</span>
          {!editing && (
            <button type="button" onClick={() => { setForm(deposit); setEditing(true); }} style={editBtnStyle} aria-label="ערוך הפקדה">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div style={{
          marginBottom: 12,
          padding: "8px 12px",
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.26)",
          borderRadius: 8,
          color: "#FBBF24",
          fontSize: 12,
        }}>
          ⚠️ {loadError}
        </div>
      )}
      {editing ? (
        <div className="flex flex-col gap-3">
          <Field label="סכום (₪)">
            <input
              type="number"
              min={1}
              step={1}
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="tx-input mono"
              dir="ltr"
            />
          </Field>
          <Field label="יעד">
            <input
              type="text"
              required
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              className="tx-input"
              dir="rtl"
            />
          </Field>
          <Field label="הפקדה הבאה">
            <input
              type="date"
              value={form.nextDate}
              onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
              className="tx-input mono"
              dir="ltr"
            />
          </Field>
          {saveError && (
            <div style={{
              padding: "8px 12px",
              background: "rgba(251,113,133,0.10)",
              border: "1px solid rgba(251,113,133,0.28)",
              borderRadius: 8,
              color: "#FB7185",
              fontSize: 12,
            }}>
              {saveError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setSaveError(null); }} style={cancelBtnStyle}>ביטול</button>
            <button type="button" onClick={save} style={saveBtnStyle}>שמור</button>
          </div>
          <style>{`
            .tx-input {
              width: 100%; padding: 10px 12px;
              background: rgba(10,12,28,0.55);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 10px; color: #F5F6FF;
              font-size: 14px; outline: none; font-family: inherit;
            }
            .tx-input:focus { border-color: rgba(52,211,153,0.5); }
            .tx-input.mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
          `}</style>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <DepositCard label="סכום" value={`₪${deposit.amount.toLocaleString()}`} emphasize />
          <DepositCard label="יעד" value={deposit.target} />
          <DepositCard label="הפקדה הבאה" value={formatDepositDate(deposit.nextDate)} mono />
        </div>
      )}
    </section>
  );
}

function formatDepositDate(iso: string): string {
  try {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  } catch { return iso; }
}

function DepositCard({ label, value, mono, emphasize }: { label: string; value: string; mono?: boolean; emphasize?: boolean }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "rgba(10,12,28,0.65)",
      border: "1px solid rgba(255,255,255,0.04)",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span className="label-cap">{label}</span>
      <span
        className={mono ? "mono" : emphasize ? "mono currency" : undefined}
        style={{
          fontSize: emphasize ? 22 : 14,
          color: "#F5F6FF",
          fontWeight: emphasize ? 700 : mono ? 600 : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ fontSize: 11, color: "#6B7094", fontWeight: 500, letterSpacing: "0.04em" }}>{label}</span>
      {children}
    </label>
  );
}

// ── Placeholders / loaders ──────────────────────────────────────────────────
function LoadingState() {
  return (
    <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
      <div style={{ padding: "48px 0", textAlign: "center", color: "#6B7094", fontSize: 13 }}>
        טוען תיק השקעות מ-Notion…
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  const envId = import.meta.env.VITE_NOTION_INVESTMENTS_DB_ID;
  const isDbIdError = /invalid or missing databaseid/i.test(message);
  return (
    <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
      <div style={{ padding: "24px 20px", textAlign: "center", color: "#FB7185", fontSize: 13, lineHeight: 1.6 }}>
        שגיאה בטעינת ההחזקות: {message}
        {isDbIdError && (
          <div style={{ marginTop: 14, fontSize: 11, color: "#B4B8D4", textAlign: "start", direction: "ltr" }}>
            <div>VITE_NOTION_INVESTMENTS_DB_ID = {envId ? <code style={{ color: "#A78BFA" }}>{envId}</code> : <span style={{ color: "#FB7185" }}>(not set)</span>}</div>
            <div style={{ marginTop: 6, color: "#6B7094" }}>
              Set / fix this in Vercel → Settings → Environment Variables, then redeploy.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ConfigMissing() {
  return (
    <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
      <div style={{ padding: "32px 0", textAlign: "center", color: "#B4B8D4", fontSize: 13, lineHeight: 1.6 }}>
        לא הוגדר <code style={{ color: "#A78BFA" }}>VITE_NOTION_INVESTMENTS_DB_ID</code>.
      </div>
    </section>
  );
}

function formatMarketState(state: string): string {
  switch (state) {
    case "REGULAR":  return "· Open";
    case "PRE":      return "· Pre";
    case "POST":
    case "POSTPOST": return "· Post";
    case "CLOSED":   return "· Closed";
    default:         return "";
  }
}

const currencyToggleStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#B4B8D4", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};
const editBtnStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 6,
  background: "rgba(167,139,250,0.12)",
  border: "1px solid rgba(167,139,250,0.28)",
  color: "#A78BFA",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit",
};
const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)", color: "#B4B8D4",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};
const saveBtnStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 10,
  background: "#34D399", color: "#0B0D24", border: "none",
  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};

export default Investments;
