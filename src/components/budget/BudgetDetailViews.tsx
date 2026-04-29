import { useMemo, useState } from "react";
import type { BudgetCategory, BudgetTransaction } from "@/hooks/useBudgetData";
import { BackButton } from "./MoneyMasterMenu";

function toCsv(rows: BudgetTransaction[]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const header = ["Date", "Name", "Amount", "Type", "Category", "Payment", "Frequency", "Notes"];
  const lines = [header.join(",")];
  for (const t of rows) {
    const date = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}-${String(t.date.getDate()).padStart(2, "0")}`;
    lines.push([
      date,
      escape(t.name),
      String(t.amount),
      t.type,
      escape(t.categoryName ?? ""),
      escape(t.paymentMethod ?? ""),
      escape(t.frequency ?? ""),
      escape(t.notes.replace(/\n/g, " ")),
    ].join(","));
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  // Prefix BOM so Excel opens Hebrew cleanly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Shared detail-view wrapper ───────────────────────────────────────────────
function ViewShell({
  title,
  accent,
  onBack,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  accent: string;
  onBack: () => void;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between" style={{ padding: "4px 2px" }}>
        <h1
          className="mono"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: accent,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        <div className="flex items-center gap-2">
          {onAdd && addLabel && (
            <button
              type="button"
              onClick={onAdd}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                background: `${accent}22`,
                border: `1px solid ${accent}48`,
                color: accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + {addLabel}
            </button>
          )}
          <BackButton onClick={onBack} />
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Full transaction table (reused for all-expenses / all-incomes / recurring) ─
export function TransactionsTableView({
  title,
  accent,
  txs,
  onBack,
  onRowClick,
  onAdd,
  addLabel,
  emptyText,
}: {
  title: string;
  accent: string;
  txs: BudgetTransaction[];
  onBack: () => void;
  onRowClick: (tx: BudgetTransaction) => void;
  onAdd?: () => void;
  addLabel?: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return txs;
    return txs.filter((t) =>
      [t.name, t.categoryName ?? "", t.paymentMethod ?? "", t.notes]
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [txs, query]);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  return (
    <ViewShell title={title} accent={accent} onBack={onBack} onAdd={onAdd} addLabel={addLabel}>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "#6B7094" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש בשם / קטגוריה / אמצעי תשלום..."
            dir="rtl"
            style={{
              flex: 1,
              padding: "8px 10px",
              background: "rgba(10,12,28,0.55)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              color: "#F5F6FF",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                color: "#B4B8D4",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              נקה
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const stamp = new Date().toISOString().slice(0, 10);
              // Keep ASCII word chars + Hebrew (U+0590–U+05FF). Everything
              // else becomes an underscore so the download is filesystem-safe
              // regardless of OS.
              const slug = title
                .replace(/[^A-Za-z0-9_֐-׿]+/g, "_")
                .replace(/^_+|_+$/g, "");
              downloadCsv(`${slug}_${stamp}.csv`, toCsv(filtered));
            }}
            disabled={filtered.length === 0}
            aria-label="ייצא ל-CSV"
            title="ייצא ל-CSV"
            style={{
              padding: "4px 10px",
              fontSize: 11,
              color: accent,
              background: `${accent}22`,
              border: `1px solid ${accent}48`,
              borderRadius: 8,
              cursor: filtered.length === 0 ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: filtered.length === 0 ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ⬇ CSV
          </button>
        </div>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "24px 0" }}>
            {query ? `אין תוצאות ל-"${query}"` : emptyText}
          </div>
        ) : (
          <>
            <div
              className="flex items-center gap-3"
              style={{
                padding: "6px 6px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "#6B7094",
                textTransform: "uppercase",
              }}
            >
              <span style={{ flex: 1 }}>שם</span>
              <span style={{ minWidth: 70, textAlign: "end" }}>תאריך</span>
              <span className="mono" style={{ minWidth: 90, textAlign: "end" }}>סכום</span>
              <span style={{ minWidth: 110, textAlign: "end" }}>קטגוריה</span>
            </div>
            {filtered.map((t, i) => (
              <button
                type="button"
                key={t.id}
                onClick={() => onRowClick(t)}
                className="tx-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 6px",
                  borderBottom: i === filtered.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "start",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "#F5F6FF",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.name}
                </span>
                <span
                  className="mono"
                  style={{ minWidth: 70, textAlign: "end", fontSize: 11, color: "#6B7094" }}
                >
                  {formatShortDate(t.date)}
                </span>
                <span
                  className="mono currency"
                  style={{ minWidth: 90, textAlign: "end", fontSize: 13, fontWeight: 600, color: "#F5F6FF" }}
                >
                  ₪{Math.round(t.amount).toLocaleString()}
                </span>
                <span
                  style={{
                    minWidth: 110,
                    textAlign: "end",
                    fontSize: 11.5,
                    color: "#B4B8D4",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: "underline",
                    textDecorationColor: "rgba(255,255,255,0.15)",
                    textUnderlineOffset: 3,
                  }}
                >
                  {t.categoryEmoji ? `${t.categoryEmoji} ` : t.categoryName ? "" : "🚫 "}
                  {t.categoryName ?? "—"}
                </span>
              </button>
            ))}
            <div
              className="flex items-center justify-end gap-3"
              style={{
                padding: "12px 6px 4px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                marginTop: 4,
              }}
            >
              <span className="label-cap" style={{ color: accent }}>
                SUM · {filtered.length}{query && filtered.length !== txs.length ? `/${txs.length}` : ""} רשומות
              </span>
              <span className="mono currency" style={{ fontSize: 16, fontWeight: 700, color: accent }}>
                ₪{Math.round(total).toLocaleString()}
              </span>
            </div>
          </>
        )}
      </section>
      <style>{`.tx-row { transition: background 120ms; } .tx-row:hover { background: rgba(255,255,255,0.04); }`}</style>
    </ViewShell>
  );
}

function formatShortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Single-category drill-in view ────────────────────────────────────────────
export function CategoryDetailView({
  category,
  expenses,
  onBack,
  onEditBudget,
  onAddExpense,
  onRowClick,
}: {
  category: BudgetCategory;
  expenses: BudgetTransaction[];
  onBack: () => void;
  onEditBudget: () => void;
  onAddExpense: () => void;
  onRowClick: (tx: BudgetTransaction) => void;
}) {
  const accent = category.color;
  const over = category.percent > 100;
  const noBudget = category.budget === 0 && category.spent > 0;
  const bar = noBudget ? 100 : Math.min(category.percent, 100);
  const remaining = category.budget - category.spent;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between" style={{ padding: "4px 2px" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#F5F6FF",
            letterSpacing: "-0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 24 }}>{category.emoji || "📊"}</span>
          {category.name}
        </h1>
        <BackButton onClick={onBack} />
      </div>

      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="label-cap" style={{ color: accent }}>
              {category.type ?? "קטגוריה"}
              {category.fixedVariable && ` · ${category.fixedVariable}`}
            </span>
            <button
              type="button"
              onClick={onEditBudget}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(167,139,250,0.12)",
                border: "1px solid rgba(167,139,250,0.28)",
                color: "#A78BFA",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              ערוך תקציב
            </button>
          </div>

          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <span className="label-cap">הוצא</span>
              <span className="mono currency" style={{ fontSize: 24, fontWeight: 700, color: over ? "#FB7185" : "#F5F6FF" }}>
                ₪{Math.round(category.spent).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col items-end" style={{ gap: 2 }}>
              <span className="label-cap">תקציב</span>
              <span className="mono currency" style={{ fontSize: 24, fontWeight: 700, color: "#B4B8D4" }}>
                {category.budget > 0 ? `₪${Math.round(category.budget).toLocaleString()}` : "—"}
              </span>
            </div>
          </div>

          <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
            <div
              style={{
                width: `${bar}%`,
                height: "100%",
                background: noBudget || over ? "#FB7185" : accent,
                boxShadow: noBudget || over ? "0 0 8px #FB7185" : `0 0 8px ${accent}`,
                borderRadius: 999,
                transition: "width 800ms cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </div>

          <div className="flex items-center justify-between" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: over ? "#FB7185" : accent }}>
              {noBudget ? "לא הוגדר תקציב" : `${Math.round(category.percent)}%`}
            </span>
            {category.budget > 0 && (
              <span className="mono currency" style={{ fontSize: 13, fontWeight: 600, color: remaining >= 0 ? "#34D399" : "#FB7185" }}>
                {remaining >= 0 ? "נותרו " : "חריגה של "}
                ₪{Math.round(Math.abs(remaining)).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12, gap: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F5F6FF" }}>
            הוצאות בקטגוריה · {expenses.length}
          </h2>
          <button
            type="button"
            onClick={onAddExpense}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "rgba(251,113,133,0.12)",
              border: "1px solid rgba(251,113,133,0.28)",
              color: "#FB7185",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            + הוצאה
          </button>
        </div>

        {expenses.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "20px 0" }}>
            אין הוצאות בקטגוריה החודש
          </div>
        ) : (
          <div className="flex flex-col">
            {expenses.map((t, i) => (
              <button
                type="button"
                key={t.id}
                onClick={() => onRowClick(t)}
                className="tx-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 6px",
                  borderBottom: i === expenses.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "start",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "#F5F6FF",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.name}
                </span>
                <span className="mono" style={{ minWidth: 60, textAlign: "end", fontSize: 11, color: "#6B7094" }}>
                  {formatShortDate(t.date)}
                </span>
                <span className="mono currency" style={{ minWidth: 80, textAlign: "end", fontSize: 13, fontWeight: 600, color: "#F5F6FF" }}>
                  ₪{Math.round(t.amount).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <style>{`.tx-row { transition: background 120ms; } .tx-row:hover { background: rgba(255,255,255,0.04); }`}</style>
    </div>
  );
}

// ── Budget categories list (read-only, for now) ──────────────────────────────
export function BudgetCategoriesView({
  categories,
  onBack,
  onOpenCategory,
  onEditBudget,
}: {
  categories: BudgetCategory[];
  onBack: () => void;
  onOpenCategory: (c: BudgetCategory) => void;
  onEditBudget: (c: BudgetCategory) => void;
}) {
  const sorted = [...categories].sort((a, b) => a.sort - b.sort);
  const totalBudget = sorted.reduce((s, c) => s + c.budget, 0);
  const totalSpent = sorted.reduce((s, c) => s + c.spent, 0);
  return (
    <ViewShell title="תקציב" accent="#A78BFA" onBack={onBack}>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 14, flexWrap: "wrap", gap: 8 }}
        >
          <span className="label-cap" style={{ color: "#A78BFA" }}>סה״כ קטגוריות · {sorted.length}</span>
          <span className="mono" style={{ fontSize: 12, color: "#B4B8D4" }}>
            <span className="currency" style={{ color: "#F5F6FF", fontWeight: 700 }}>
              ₪{Math.round(totalSpent).toLocaleString()}
            </span>
            {" / "}
            <span className="currency">₪{Math.round(totalBudget).toLocaleString()}</span>
          </span>
        </div>
        <div className="flex flex-col" style={{ gap: 4 }}>
          {sorted.map((c) => (
            <div
              key={c.id}
              className="cat-list-row"
              style={{
                position: "relative",
                borderRadius: 8,
                padding: "10px 6px",
              }}
            >
              <button
                type="button"
                onClick={() => onOpenCategory(c)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "start",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: 0,
                }}
              >
                <CategoryRowCompact c={c} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBudget(c);
                }}
                aria-label="ערוך תקציב"
                style={{
                  position: "absolute",
                  insetInlineStart: 6,
                  top: 10,
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "rgba(167,139,250,0.12)",
                  border: "1px solid rgba(167,139,250,0.28)",
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
          ))}
        </div>
      </section>
      <style>{`
        .cat-list-row { transition: background 120ms; }
        .cat-list-row:hover { background: rgba(255,255,255,0.04); }
      `}</style>
    </ViewShell>
  );
}

function CategoryRowCompact({ c }: { c: BudgetCategory }) {
  const over = c.percent > 100;
  const noBudget = c.budget === 0;
  const bar = noBudget ? 100 : Math.min(c.percent, 100);
  const color = over
    ? "#FB7185"
    : c.percent >= 70
    ? "#FBBF24"
    : c.type === "חסכון"
    ? "#A78BFA"
    : "#34D399";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#F5F6FF", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {c.emoji && <span style={{ fontSize: 14 }}>{c.emoji}</span>}
          {c.name}
          {c.type && (
            <span style={{ fontSize: 9, color: "#6B7094", fontWeight: 500 }}>· {c.type}</span>
          )}
        </span>
        <span className="mono" style={{ fontSize: 11.5, color: over ? "#FB7185" : "#B4B8D4" }}>
          <span className="currency" style={{ color: "#F5F6FF", fontWeight: 600 }}>
            ₪{Math.round(c.spent).toLocaleString()}
          </span>
          {" / "}
          <span className="currency">₪{Math.round(c.budget).toLocaleString()}</span>
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${bar}%`,
            height: "100%",
            background: noBudget ? "rgba(251,113,133,0.4)" : color,
            boxShadow: noBudget ? "none" : `0 0 6px ${color}`,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

// ── Placeholder for not-yet-built views ──────────────────────────────────────
export function PlaceholderView({
  title,
  accent,
  note,
  onBack,
}: {
  title: string;
  accent: string;
  note: string;
  onBack: () => void;
}) {
  return (
    <ViewShell title={title} accent={accent} onBack={onBack}>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div
          style={{
            padding: "48px 16px",
            textAlign: "center",
            color: "#6B7094",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛠️</div>
          <div style={{ color: "#B4B8D4", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
            בקרוב
          </div>
          <div>{note}</div>
        </div>
      </section>
    </ViewShell>
  );
}
