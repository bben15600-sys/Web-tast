import { useMemo, useState } from "react";
import { usePantry, pantryStatus, type PantryCategory, type PantryItem } from "@/hooks/usePantry";

const CATEGORIES: PantryCategory[] = [
  "ירקות ופירות",
  "בשר ודגים",
  "מוצרי חלב",
  "פחמימות",
  "תבלינים",
  "שימורים",
  "אחר",
];

export function PantryTab() {
  const { items, loading, error, isConfigMissing, isSample, addItem, updateQty, removeItem, isMutating } = usePantry();
  const [filter, setFilter] = useState<"all" | "low" | "empty">("all");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => pantryStatus(i) === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const out = { all: items.length, low: 0, empty: 0 };
    for (const i of items) {
      const s = pantryStatus(i);
      if (s === "low") out.low++;
      if (s === "empty") out.empty++;
    }
    return out;
  }, [items]);

  return (
    <section className="glass" style={{ padding: 20 }}>
      <div className="card-header" style={{ marginBottom: 14 }}>
        <h3 className="card-title">מלאי המטבח</h3>
        <span className="label-cap">
          {counts.empty + counts.low > 0 ? `${counts.empty + counts.low} פריטים בחוסר` : "מלאי מלא"}
        </span>
      </div>

      {isConfigMissing && (
        <div style={configMissingStyle}>
          ⚙️ מלאי דוגמה. הוסף <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>VITE_NOTION_PANTRY_DB_ID</code> ב-Vercel.
        </div>
      )}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="הכל" count={counts.all} />
        <FilterChip active={filter === "low"} onClick={() => setFilter("low")} label="נמוך" count={counts.low} color="#FBBF24" />
        <FilterChip active={filter === "empty"} onClick={() => setFilter("empty")} label="אזל" count={counts.empty} color="#FB7185" />
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          disabled={isSample}
          style={{ ...primaryBtnStyle, marginInlineStart: "auto" }}
        >
          + הוסף פריט
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 36, textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 13 }}>
          טוען מלאי…
        </div>
      ) : filtered.length === 0 ? (
        <div style={emptyStateStyle}>
          {filter === "all" ? "אין פריטים במלאי" : `אין פריטים בקטגוריה "${filter === "low" ? "נמוך" : "אזל"}"`}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {filtered.map((item) => (
            <PantryCard
              key={item.id}
              item={item}
              isMutating={isMutating}
              isSample={isSample}
              onUpdateQty={(qty) => updateQty(item.id, qty)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      {(counts.low > 0 || counts.empty > 0) && (
        <div style={{
          marginTop: 14,
          fontSize: 11.5,
          color: "var(--oslife-text-mute)",
          background: "rgba(251,191,36,0.06)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: 10,
          padding: "10px 14px",
        }}>
          ⚡ פריטים בחוסר נוספים אוטומטית לרשימת הקניות
        </div>
      )}

      {showAdd && (
        <AddPantryModal
          isMutating={isMutating}
          onClose={() => setShowAdd(false)}
          onAdd={async (input) => {
            await addItem(input);
            setShowAdd(false);
          }}
        />
      )}
    </section>
  );
}

function PantryCard({
  item,
  isMutating,
  isSample,
  onUpdateQty,
  onRemove,
}: {
  item: PantryItem;
  isMutating: boolean;
  isSample: boolean;
  onUpdateQty: (qty: number) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const status = pantryStatus(item);
  const fillRatio = item.reorderAt > 0 ? Math.min(item.qty / Math.max(item.reorderAt * 5, 1), 1) : 0.5;
  const color = status === "empty" ? "#FB7185" : status === "low" ? "#FBBF24" : "#34D399";

  return (
    <div style={pantryCardStyle(status)}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{item.emoji || "📦"}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--oslife-text-strong)" }}>{item.name}</div>
      <div style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>
        {item.qty} {item.unit}
      </div>
      {status !== "ok" && (
        <div style={{ fontSize: 9, fontWeight: 700, color, marginTop: 4, letterSpacing: "0.04em" }}>
          {status === "empty" ? "✕ אזל" : "⚠ נמוך"}
        </div>
      )}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${fillRatio * 100}%`, background: color, borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => onUpdateQty(Math.max(0, item.qty - 1))}
          disabled={isMutating || isSample}
          style={qtyBtnStyle}
          aria-label="הפחת"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onUpdateQty(item.qty + 1)}
          disabled={isMutating || isSample}
          style={qtyBtnStyle}
          aria-label="הוסף"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`להסיר את "${item.name}" מהמלאי?`)) onRemove();
          }}
          disabled={isMutating || isSample}
          style={{ ...qtyBtnStyle, marginInlineStart: "auto", color: "#FB7185" }}
          aria-label="הסר"
          title="הסר"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

function AddPantryModal({
  isMutating,
  onClose,
  onAdd,
}: {
  isMutating: boolean;
  onClose: () => void;
  onAdd: (input: { name: string; qty: number; unit: string; category: PantryCategory; reorderAt: number; emoji: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("יח");
  const [category, setCategory] = useState<PantryCategory>("אחר");
  const [reorderAt, setReorderAt] = useState(1);
  const [emoji, setEmoji] = useState("📦");

  return (
    <div role="dialog" aria-modal="true" style={modalOverlayStyle} onClick={onClose}>
      <div className="glass" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--oslife-text-strong)" }}>פריט חדש למלאי</h4>
          <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="סגור">✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="שם">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Field label="כמות">
              <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="יחידה">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <Field label="קטגוריה">
            <select value={category} onChange={(e) => setCategory(e.target.value as PantryCategory)} style={inputStyle}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Field label="סף הזמנה">
              <input type="number" value={reorderAt} onChange={(e) => setReorderAt(Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="אימוג׳י">
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} style={inputStyle} maxLength={2} />
            </Field>
          </div>
          <button
            type="button"
            disabled={isMutating || !name.trim()}
            onClick={() => onAdd({ name: name.trim(), qty, unit, category, reorderAt, emoji })}
            style={{ ...primaryBtnStyle, padding: "10px 16px", marginTop: 4 }}
          >
            {isMutating ? "שומר…" : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <span style={{ fontSize: 11, color: "var(--oslife-text-mute)", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function FilterChip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...navBtnStyle,
        ...(active ? { background: "rgba(167,139,250,0.16)", borderColor: "rgba(167,139,250,0.32)", color: color ?? "#A78BFA" } : color ? { color } : {}),
      }}
    >
      {label} <span style={{ opacity: 0.7, marginInlineStart: 4 }}>{count}</span>
    </button>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: "7px 13px",
  borderRadius: 9,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--oslife-text-mid)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const primaryBtnStyle: React.CSSProperties = {
  ...navBtnStyle,
  background: "rgba(201,100,66,0.16)",
  border: "1px solid rgba(201,100,66,0.32)",
  color: "#E89A7D",
};
const qtyBtnStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-mid)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  minWidth: 24,
};
const closeBtnStyle: React.CSSProperties = {
  padding: "4px 9px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--oslife-text-mid)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--oslife-chip)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-strong)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 100,
  backdropFilter: "blur(4px)",
};
const modalCardStyle: React.CSSProperties = {
  width: "min(100%, 420px)",
  padding: 20,
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
};
const configMissingStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 11,
  color: "#FBBF24",
  background: "rgba(251,191,36,0.08)",
  border: "1px solid rgba(251,191,36,0.26)",
  borderRadius: 8,
  marginBottom: 12,
};
const errorStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  color: "#FB7185",
  background: "rgba(251,113,133,0.08)",
  border: "1px solid rgba(251,113,133,0.28)",
  borderRadius: 8,
  marginBottom: 12,
};
const emptyStateStyle: React.CSSProperties = {
  padding: "36px 0",
  textAlign: "center",
  color: "var(--oslife-text-mute)",
  fontSize: 13,
};
function pantryCardStyle(status: "ok" | "low" | "empty"): React.CSSProperties {
  const borderColor =
    status === "empty" ? "rgba(251,113,133,0.3)" :
    status === "low" ? "rgba(251,191,36,0.3)" :
    "var(--oslife-chip-border)";
  const bg =
    status === "empty" ? "rgba(251,113,133,0.04)" :
    status === "low" ? "rgba(251,191,36,0.04)" :
    "rgba(255,255,255,0.03)";
  return {
    background: bg,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };
}
