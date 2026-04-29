import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveNotionPage,
  createNotionPage,
  updateNotionPage,
} from "@/lib/notion";
import type { Holding } from "@/hooks/useInvestments";

type Mode = "create" | "edit";

const TYPE_OPTIONS = [
  "ETF",
  "Stock",
  "Cash",
  "Crypto",
  "Bond",
  "מזומן",
  "מניות",
  "קריפטו",
  "אגח",
];

export function HoldingFormModal({
  mode,
  initial,
  onClose,
}: {
  mode: Mode;
  initial?: Holding;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initial ? buildNameField(initial) : "");
  const [value, setValue] = useState(initial?.value?.toString() ?? "");
  const [changePct, setChangePct] = useState(initial?.changePct?.toString() ?? "0");
  const [type, setType] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const envDbId = import.meta.env.VITE_NOTION_INVESTMENTS_DB_ID;

  const buildProperties = () => {
    if (!name.trim()) throw new Error("שם חובה");
    const val = Number(value);
    if (!Number.isFinite(val)) throw new Error("שווי לא תקין");
    const chg = Number(changePct);
    if (!Number.isFinite(chg)) throw new Error("שינוי באחוזים לא תקין");

    const properties: Record<string, unknown> = {
      "Name": { title: [{ text: { content: name.trim() } }] },
      "Value": { number: val },
      "Change": { number: chg },
    };
    if (type) properties["Type"] = { select: { name: type } };
    return properties;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const properties = buildProperties();
      if (mode === "create") {
        if (!envDbId) throw new Error("חסר VITE_NOTION_INVESTMENTS_DB_ID");
        return createNotionPage({ databaseId: envDbId, properties });
      }
      if (!initial) throw new Error("אין החזקה לעריכה");
      return updateNotionPage({ pageId: initial.id, properties });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notion", "investments"] });
      onClose();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "שגיאה"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!initial) throw new Error("אין החזקה למחיקה");
      return archiveNotionPage({ pageId: initial.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notion", "investments"] });
      onClose();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "שגיאה"),
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
        aria-label={mode === "create" ? "הוספת החזקה" : "עריכת החזקה"}
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
            {mode === "create" ? "הוסף החזקה" : "ערוך החזקה"}
          </h2>
          <button type="button" onClick={onClose} disabled={busy} style={closeBtnStyle}>✕</button>
        </div>

        <Field label='שם — אפשר "SYMBOL - שם מלא" (למשל "VOO - S&P 500")'>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            dir="auto"
            className="tx-input"
            autoFocus
          />
        </Field>

        <Field label="שווי התיק (₪)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            dir="ltr"
            className="tx-input mono"
          />
        </Field>

        <Field label="שינוי (%) — חיובי או שלילי">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={changePct}
            onChange={(e) => setChangePct(e.target.value)}
            disabled={busy}
            dir="ltr"
            className="tx-input mono"
          />
        </Field>

        <Field label="סוג">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={busy}
            className="tx-input"
          >
            <option value="">— ללא —</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        {error && (
          <div style={{
            fontSize: 12, color: "#FB7185",
            background: "rgba(251,113,133,0.10)",
            padding: "8px 12px", borderRadius: 8,
            border: "1px solid rgba(251,113,133,0.24)",
          }}>⚠️ {error}</div>
        )}

        <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 4 }}>
          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("למחוק את ההחזקה?")) deleteMutation.mutate();
              }}
              disabled={busy}
              style={{
                padding: "8px 14px", borderRadius: 10,
                background: "rgba(251,113,133,0.12)", color: "#FB7185",
                border: "1px solid rgba(251,113,133,0.26)",
                fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >מחק</button>
          ) : <span />}

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} style={secondaryBtnStyle}>ביטול</button>
            <button
              type="button"
              onClick={() => { setError(null); try { buildProperties(); } catch (e) { setError(e instanceof Error ? e.message : "שגיאה"); return; } saveMutation.mutate(); }}
              disabled={busy}
              style={primaryBtnStyle}
            >{busy ? "שומר..." : "שמור"}</button>
          </div>
        </div>

        <style>{`
          .tx-input {
            width: 100%; padding: 10px 12px;
            background: rgba(10,12,28,0.55);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px; color: #F5F6FF;
            font-size: 14px; outline: none;
            font-family: inherit;
          }
          .tx-input:focus { border-color: rgba(167,139,250,0.5); }
          .tx-input:disabled { opacity: 0.6; }
          .tx-input.mono { font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: -0.01em; }
        `}</style>
      </div>
    </div>
  );
}

function buildNameField(h: Holding): string {
  if (h.symbol && h.name && !h.name.includes(h.symbol)) return `${h.symbol} - ${h.name}`;
  return h.name;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ fontSize: 11, color: "#6B7094", fontWeight: 500, letterSpacing: "0.04em" }}>{label}</span>
      {children}
    </label>
  );
}

const closeBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  background: "rgba(255,255,255,0.06)", border: "none",
  color: "#B4B8D4", cursor: "pointer", fontSize: 14,
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)", color: "#B4B8D4",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};
const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 10,
  background: "#34D399", color: "#0B0D24", border: "none",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
  minWidth: 80, fontFamily: "inherit",
};
