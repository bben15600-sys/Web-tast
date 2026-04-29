import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNotionPage } from "@/lib/notion";
import type { BudgetCategory } from "@/hooks/useBudgetData";

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export function CategoryBudgetModal({
  category,
  monthDate,
  onClose,
}: {
  category: BudgetCategory;
  monthDate?: Date;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const activeMonth = monthDate ?? new Date();
  const monthColumnName = HEBREW_MONTHS[activeMonth.getMonth()];
  const monthLabel = `${monthColumnName} ${activeMonth.getFullYear()}`;

  const [uniform, setUniform] = useState(String(category.budget || ""));
  const [monthly, setMonthly] = useState("");
  const [mode, setMode] = useState<"uniform" | "monthly">("uniform");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const properties: Record<string, unknown> = {};
      if (mode === "uniform") {
        const amt = Number(uniform);
        if (!Number.isFinite(amt) || amt < 0) throw new Error("תקציב אחיד לא תקין");
        properties["תקציב אחיד"] = { number: amt };
      } else {
        const amt = monthly === "" ? null : Number(monthly);
        if (amt != null && (!Number.isFinite(amt) || amt < 0)) throw new Error("תקציב חודשי לא תקין");
        properties[monthColumnName] = { number: amt };
      }
      return updateNotionPage({
        integration: "mm",
        pageId: category.id,
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

  const busy = saveMutation.isPending;

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
        aria-label="ערוך תקציב"
        style={{
          width: "100%",
          maxWidth: 420,
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
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F5F6FF", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{category.emoji || "📊"}</span>
            ערוך תקציב · {category.name}
          </h2>
          <button
            type="button"
            aria-label="סגור"
            onClick={onClose}
            disabled={busy}
            style={closeBtnStyle}
          >
            ✕
          </button>
        </div>

        <div
          role="tablist"
          className="flex items-center gap-1"
          style={{
            padding: 3,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999,
            width: "fit-content",
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "uniform"}
            onClick={() => setMode("uniform")}
            disabled={busy}
            style={{
              padding: "4px 14px",
              borderRadius: 999,
              border: "none",
              background: mode === "uniform" ? "rgba(255,255,255,0.10)" : "transparent",
              color: mode === "uniform" ? "#F5F6FF" : "#6B7094",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            תקציב אחיד
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "monthly"}
            onClick={() => setMode("monthly")}
            disabled={busy}
            style={{
              padding: "4px 14px",
              borderRadius: 999,
              border: "none",
              background: mode === "monthly" ? "rgba(255,255,255,0.10)" : "transparent",
              color: mode === "monthly" ? "#F5F6FF" : "#6B7094",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {monthLabel} בלבד
          </button>
        </div>

        {mode === "uniform" ? (
          <label className="flex flex-col gap-1.5">
            <span style={{ fontSize: 11, color: "#6B7094", fontWeight: 500, letterSpacing: "0.04em" }}>
              תקציב אחיד (₪) — ברירת מחדל לכל החודשים
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={uniform}
              onChange={(e) => setUniform(e.target.value)}
              disabled={busy}
              dir="ltr"
              className="mono"
              style={inputStyle}
              autoFocus
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span style={{ fontSize: 11, color: "#6B7094", fontWeight: 500, letterSpacing: "0.04em" }}>
              תקציב ל-{monthLabel} (₪) — השאר ריק כדי להסיר override
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              disabled={busy}
              dir="ltr"
              className="mono"
              placeholder={`ברירת מחדל: ₪${Math.round(category.budget).toLocaleString()}`}
              style={inputStyle}
              autoFocus
            />
          </label>
        )}

        <div style={{ fontSize: 11, color: "#6B7094", lineHeight: 1.5 }}>
          {mode === "uniform"
            ? <>מעדכן את השדה <code style={{ color: "#A78BFA" }}>תקציב אחיד</code>. חל על כל החודשים שאין בהם ערך ספציפי.</>
            : <>מעדכן את השדה <code style={{ color: "#A78BFA" }}>{monthColumnName}</code> ב-Notion. גובר על התקציב האחיד לחודש זה בלבד.</>}
        </div>

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

        <div className="flex items-center justify-end gap-2" style={{ marginTop: 4 }}>
          <button type="button" onClick={onClose} disabled={busy} style={secondaryBtnStyle}>
            ביטול
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              saveMutation.mutate();
            }}
            disabled={busy}
            style={{ ...primaryBtnStyle, background: "#A78BFA" }}
          >
            {busy ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(10,12,28,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#F5F6FF",
  fontSize: 14,
  outline: "none",
  fontFamily: "JetBrains Mono, monospace",
  letterSpacing: "-0.01em",
};

const closeBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
  border: "none",
  color: "#B4B8D4",
  cursor: "pointer",
  fontSize: 14,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  color: "#B4B8D4",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  background: "#A78BFA",
  color: "#0B0D24",
  border: "none",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  minWidth: 80,
  fontFamily: "inherit",
};
