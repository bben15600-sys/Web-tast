import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveNotionPage,
  createNotionPage,
  updateNotionPage,
} from "@/lib/notion";
import type { BudgetCategory } from "@/hooks/useBudgetData";

const TYPE_OPTIONS = ["חובה", "מותרות", "חסכון"] as const;
const FIXED_OPTIONS = ["קבועה", "משתנה"] as const;

type Mode = "create" | "edit";

export function CategoryManageModal({
  mode,
  initial,
  onClose,
}: {
  mode: Mode;
  initial?: BudgetCategory;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [type, setType] = useState<string>(initial?.type ?? "מותרות");
  const [fixedVariable, setFixedVariable] = useState<string>(initial?.fixedVariable ?? "משתנה");
  const [group, setGroup] = useState(initial?.group ?? "");
  const [budget, setBudget] = useState(String(initial?.budget ?? ""));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const envDbId = import.meta.env.VITE_NOTION_BUDGET_DB_ID;

  const buildProperties = () => {
    if (!name.trim()) throw new Error("שם חובה");
    const amt = Number(budget);
    if (budget !== "" && (!Number.isFinite(amt) || amt < 0)) throw new Error("תקציב לא תקין");

    const properties: Record<string, unknown> = {
      "name": { title: [{ text: { content: name.trim() } }] },
    };
    if (emoji) properties["Emoji"] = { rich_text: [{ text: { content: emoji } }] };
    if (type) properties["סוג"] = { select: { name: type } };
    if (fixedVariable) properties["קבועה / משתנה"] = { select: { name: fixedVariable } };
    if (group.trim()) properties["נושא הקטגוריה"] = { select: { name: group.trim() } };
    if (budget !== "") properties["תקציב אחיד"] = { number: amt };
    return properties;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const properties = buildProperties();
      if (mode === "create") {
        if (!envDbId) throw new Error("חסר VITE_NOTION_BUDGET_DB_ID");
        return createNotionPage({
          integration: "mm",
          databaseId: envDbId,
          properties,
        });
      }
      if (!initial) throw new Error("אין קטגוריה לעריכה");
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
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "שגיאה"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!initial) throw new Error("אין קטגוריה למחיקה");
      return archiveNotionPage({ integration: "mm", pageId: initial.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm"] });
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
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        role="dialog"
        aria-label={mode === "create" ? "הוספת קטגוריה" : "עריכת קטגוריה"}
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
            {mode === "create" ? "הוסף קטגוריה" : "ערוך קטגוריה"}
          </h2>
          <button type="button" onClick={onClose} disabled={busy} style={closeBtnStyle}>✕</button>
        </div>

        <Field label="שם הקטגוריה">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} dir="rtl" className="cm-input" autoFocus />
        </Field>

        <Field label="אימוג'י (אופציונלי)">
          <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} disabled={busy} className="cm-input" placeholder="🍿" maxLength={4} style={{ fontSize: 18 }} />
        </Field>

        <div className="flex gap-2">
          <Field label="סוג">
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={busy} className="cm-input">
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="קבועה / משתנה">
            <select value={fixedVariable} onChange={(e) => setFixedVariable(e.target.value)} disabled={busy} className="cm-input">
              {FIXED_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <Field label="נושא הקטגוריה (למשל דיור / אוכל ובילויים)">
          <input type="text" value={group} onChange={(e) => setGroup(e.target.value)} disabled={busy} dir="rtl" className="cm-input" />
        </Field>

        <Field label="תקציב אחיד (₪)">
          <input type="number" inputMode="decimal" step="1" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} disabled={busy} dir="ltr" className="cm-input mono" />
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
              onClick={() => { if (window.confirm("למחוק את הקטגוריה? הטרנזקציות יישארו אך יסומנו 'לא שובץ'.")) deleteMutation.mutate(); }}
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
              onClick={() => {
                setError(null);
                try { buildProperties(); } catch (e) { setError(e instanceof Error ? e.message : "שגיאה"); return; }
                saveMutation.mutate();
              }}
              disabled={busy}
              style={primaryBtnStyle}
            >{busy ? "שומר..." : "שמור"}</button>
          </div>
        </div>

        <style>{`
          .cm-input {
            width: 100%; padding: 10px 12px;
            background: rgba(10,12,28,0.55);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px; color: #F5F6FF;
            font-size: 14px; outline: none;
            font-family: inherit;
          }
          .cm-input:focus { border-color: rgba(167,139,250,0.5); }
          .cm-input:disabled { opacity: 0.6; }
          .cm-input.mono { font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: -0.01em; }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5" style={{ flex: 1 }}>
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
  background: "#A78BFA", color: "#0B0D24", border: "none",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
  minWidth: 80, fontFamily: "inherit",
};
