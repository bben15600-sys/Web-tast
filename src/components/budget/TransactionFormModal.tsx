import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveNotionPage,
  createNotionPage,
  updateNotionPage,
} from "@/lib/notion";
import type {
  BudgetCategory,
  BudgetTransaction,
} from "@/hooks/useBudgetData";

type Mode = "create" | "edit";
type Kind = "expense" | "income";

export type TransactionFormModalProps = {
  mode: Mode;
  kind: Kind;
  initial?: BudgetTransaction;
  /**
   * Pre-populate the create form from an external source (receipt OCR,
   * voice input, etc.). Ignored when editing an existing transaction.
   */
  prefill?: {
    name?: string;
    amount?: number;
    date?: string; // ISO YYYY-MM-DD
    paymentMethod?: string | null;
    /** Hebrew category name — will be matched against `categories[i].name`. */
    categoryHint?: string | null;
    notes?: string | null;
  };
  presetCategoryId?: string;
  categories: BudgetCategory[];
  pastTransactions?: BudgetTransaction[];
  onClose: () => void;
};

// Rank past expenses whose name looks similar to the given query, and return
// the category id that appears most frequently among the top matches.
function suggestCategoryId(
  query: string,
  past: BudgetTransaction[] | undefined,
): string | null {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2 || !past || past.length === 0) return null;
  const matches = past.filter(
    (t) => t.type === "expense" && t.categoryId && t.name.toLowerCase().includes(q),
  );
  if (matches.length === 0) return null;
  const counts = new Map<string, number>();
  for (const t of matches) {
    if (!t.categoryId) continue;
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  let best: { id: string; count: number } | null = null;
  for (const [id, count] of counts) {
    if (!best || count > best.count) best = { id, count };
  }
  return best?.id ?? null;
}

const EXPENSE_PAYMENT_METHODS = [
  "🍏 Apple Pay",
  "💳 אשראי",
  "💵 מזומן",
  "🏦 העברה",
];

const INCOME_PAYMENT_METHODS = [
  "🏦 בנק",
  "💵 מזומן",
  "💳 ביט",
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TransactionFormModal({
  mode,
  kind,
  initial,
  prefill,
  presetCategoryId,
  categories,
  pastTransactions,
  onClose,
}: TransactionFormModalProps) {
  const qc = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Match a Hebrew category name from OCR/voice to an actual category by
  // name, falling back to a case-insensitive substring if no exact hit.
  const matchCategoryByName = (hint?: string | null): string | "" => {
    if (!hint) return "";
    const hintTrim = hint.trim();
    if (!hintTrim) return "";
    const exact = categories.find((c) => c.name === hintTrim);
    if (exact) return exact.id;
    const lower = hintTrim.toLowerCase();
    const fuzzy = categories.find(
      (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()),
    );
    return fuzzy?.id ?? "";
  };

  const [name, setName] = useState(initial?.name ?? prefill?.name ?? "");
  const [amount, setAmount] = useState(
    initial?.amount?.toString() ?? (prefill?.amount != null ? String(prefill.amount) : ""),
  );
  const [date, setDate] = useState(
    initial?.date
      ? dateToIso(initial.date)
      : prefill?.date && /^\d{4}-\d{2}-\d{2}$/.test(prefill.date)
        ? prefill.date
        : todayIso(),
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? presetCategoryId ?? matchCategoryByName(prefill?.categoryHint),
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initial?.paymentMethod ?? prefill?.paymentMethod ?? "",
  );
  const [autoSuggested, setAutoSuggested] = useState(false);

  // When creating a new expense, watch the name and suggest a category based
  // on the user's past expenses. Only fills a category if the user hasn't
  // already picked one (so we never overwrite an explicit choice).
  useEffect(() => {
    if (mode !== "create" || kind !== "expense") return;
    if (categoryId && !autoSuggested) return;
    const suggested = suggestCategoryId(name, pastTransactions);
    if (suggested && suggested !== categoryId) {
      setCategoryId(suggested);
      setAutoSuggested(true);
    } else if (!suggested && autoSuggested) {
      setCategoryId("");
      setAutoSuggested(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, mode, kind, pastTransactions]);
  const [error, setError] = useState<string | null>(null);

  const paymentOptions = kind === "expense" ? EXPENSE_PAYMENT_METHODS : INCOME_PAYMENT_METHODS;
  const accent = kind === "expense" ? "#FB7185" : "#34D399";

  const envDbId =
    kind === "expense"
      ? import.meta.env.VITE_NOTION_EXPENSES_DB_ID
      : import.meta.env.VITE_NOTION_INCOME_DB_ID;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLInputElement>("input[autofocus], input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const buildProperties = () => {
    const amt = Number(amount);
    if (!name.trim()) throw new Error("שם חובה");
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("סכום לא תקין");
    if (!date) throw new Error("תאריך חובה");

    const properties: Record<string, unknown> = {
      "שם": { title: [{ text: { content: name.trim() } }] },
      "סכום": { number: amt },
      "תאריך": { date: { start: date } },
    };

    if (paymentMethod) {
      properties["אמצעי תשלום"] = { select: { name: paymentMethod } };
    }

    if (kind === "expense" && categoryId) {
      properties["קטגוריה"] = { relation: [{ id: categoryId }] };
    }

    return properties;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const properties = buildProperties();
      if (mode === "create") {
        if (!envDbId) throw new Error("חסר VITE_NOTION_*_DB_ID");
        return createNotionPage({
          integration: "mm",
          databaseId: envDbId,
          properties,
        });
      }
      if (!initial) throw new Error("אין רשומה לעריכה");
      return updateNotionPage({
        integration: "mm",
        pageId: initial.id,
        properties,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm"] });
      onClose();
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "שגיאה לא ידועה");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!initial) throw new Error("אין רשומה למחיקה");
      return archiveNotionPage({ integration: "mm", pageId: initial.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm"] });
      onClose();
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "שגיאה לא ידועה");
    },
  });

  const busy = saveMutation.isPending || deleteMutation.isPending;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: "rgba(5,7,18,0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 100,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-label={
          mode === "create"
            ? kind === "expense"
              ? "הוסף הוצאה"
              : "הוסף הכנסה"
            : kind === "expense"
            ? "ערוך הוצאה"
            : "ערוך הכנסה"
        }
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(22,26,58,0.92)",
          backdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 18,
          padding: 20,
          boxShadow: "0 40px 80px -24px rgba(0,0,0,0.7)",
          direction: "rtl",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F5F6FF" }}>
            {mode === "create"
              ? kind === "expense"
                ? "הוסף הוצאה"
                : "הוסף הכנסה"
              : kind === "expense"
              ? "ערוך הוצאה"
              : "ערוך הכנסה"}
          </h2>
          <button
            type="button"
            aria-label="סגור"
            onClick={onClose}
            disabled={busy}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#B4B8D4",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <Field label="שם">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            dir="rtl"
            className="tx-input"
            autoFocus
          />
        </Field>

        <Field label="סכום (₪)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            dir="ltr"
            className="tx-input mono"
          />
        </Field>

        <Field label="תאריך">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
            dir="ltr"
            className="tx-input mono"
          />
        </Field>

        {kind === "expense" && (
          <Field label={autoSuggested ? "קטגוריה · ✨ הוצעה אוטומטית מהיסטוריה" : "קטגוריה"}>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setAutoSuggested(false);
              }}
              disabled={busy}
              className="tx-input"
              dir="rtl"
              style={autoSuggested ? { borderColor: "rgba(167,139,250,0.45)" } : undefined}
            >
              <option value="">— ללא —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ""}{c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="אמצעי תשלום">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={busy}
            className="tx-input"
            dir="rtl"
          >
            <option value="">— ללא —</option>
            {paymentOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        {error && (
          <div
            style={{
              fontSize: 12,
              color: "#FB7185",
              background: "rgba(251,113,133,0.10)",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(251,113,133,0.24)",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 4 }}>
          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("למחוק את הרשומה?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={busy}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(251,113,133,0.12)",
                color: "#FB7185",
                border: "1px solid rgba(251,113,133,0.26)",
                fontSize: 13,
                fontWeight: 600,
                cursor: busy ? "default" : "pointer",
              }}
            >
              מחק
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                color: "#B4B8D4",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 13,
                fontWeight: 500,
                cursor: busy ? "default" : "pointer",
              }}
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                try {
                  buildProperties();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "שגיאה");
                  return;
                }
                saveMutation.mutate();
              }}
              disabled={busy}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                background: accent,
                color: "#0B0D24",
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? "default" : "pointer",
                minWidth: 80,
              }}
            >
              {busy ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>

        <style>{`
          .tx-input {
            width: 100%;
            padding: 10px 12px;
            background: rgba(10,12,28,0.55);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            color: #F5F6FF;
            font-size: 14px;
            outline: none;
            transition: border-color 160ms;
            font-family: inherit;
          }
          .tx-input:focus {
            border-color: rgba(167,139,250,0.5);
          }
          .tx-input:disabled { opacity: 0.6; }
          .tx-input.mono {
            font-family: "JetBrains Mono", ui-monospace, monospace;
            letter-spacing: -0.01em;
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ fontSize: 11, color: "#6B7094", fontWeight: 500, letterSpacing: "0.04em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
