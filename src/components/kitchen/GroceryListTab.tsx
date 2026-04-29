import { useMemo, useState } from "react";
import { useMealPlan } from "@/hooks/useMealPlan";
import { usePantry } from "@/hooks/usePantry";
import { generateGroceryList, summarizeGroceryList, type GroceryItem } from "@/lib/groceryList";
import type { Recipe } from "@/hooks/useRecipes";
import type { PantryCategory } from "@/hooks/usePantry";

const CATEGORY_ICONS: Record<PantryCategory, string> = {
  "ירקות ופירות": "🥬",
  "בשר ודגים": "🥩",
  "מוצרי חלב": "🧀",
  "פחמימות": "🌾",
  "תבלינים": "🧂",
  "שימורים": "🥫",
  "אחר": "🛒",
};

export function GroceryListTab({ recipes }: { recipes: Recipe[] }) {
  const meal = useMealPlan();
  const pantry = usePantry();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  const items = useMemo(
    () => generateGroceryList({ mealPlan: meal.entries, recipes, pantry: pantry.items }),
    [meal.entries, recipes, pantry.items],
  );

  const summary = useMemo(() => summarizeGroceryList(items), [items]);

  const visible = showOnlyMissing ? items.filter((i) => !i.inPantry) : items;
  const grouped = useMemo(() => groupByCategory(visible), [visible]);

  const toggleChecked = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const shareViaWhatsApp = () => {
    const lines = ["רשימת קניות:"];
    for (const cat of Object.keys(grouped)) {
      lines.push(`\n${cat}:`);
      for (const item of grouped[cat as PantryCategory] ?? []) {
        if (checked.has(item.key)) continue;
        lines.push(`• ${item.name} — ${formatAmount(item.amount, item.unit)}`);
      }
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="glass" style={{ padding: 20 }}>
      <div className="card-header" style={{ marginBottom: 14 }}>
        <h3 className="card-title">רשימת קניות</h3>
        <span className="label-cap">{summary.needFromStore} פריטים נחוצים</span>
      </div>

      {(meal.isConfigMissing || pantry.isConfigMissing) && (
        <div style={configMissingStyle}>
          ⚙️ מוצגות רשימות מתבססות על נתוני דוגמה. הוסף את משתני ה-Notion (MEALPLAN / PANTRY / RECIPES) ב-Vercel.
        </div>
      )}

      <div style={statsRowStyle}>
        <StatChip value={String(summary.totalItems)} label="סך הכל פריטים" />
        <StatChip value={String(summary.needFromStore)} label="לקנות" color="#FB7185" />
        <StatChip value={String(summary.alreadyInPantry)} label="קיים במלאי" color="#34D399" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setShowOnlyMissing((v) => !v)}
          style={showOnlyMissing ? primaryBtnStyle : navBtnStyle}
        >
          {showOnlyMissing ? "✓ רק חסרים" : "הצג רק חסרים"}
        </button>
        <button type="button" onClick={shareViaWhatsApp} style={navBtnStyle}>
          שתף ב-WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setChecked(new Set())}
          style={navBtnStyle}
          disabled={checked.size === 0}
        >
          נקה סימונים ({checked.size})
        </button>
      </div>

      {items.length === 0 ? (
        <div style={emptyStateStyle}>
          אין ארוחות מתוכננות בשבוע הזה — תכנן ארוחות בלשונית "תכנון ארוחות"
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {(Object.keys(grouped) as PantryCategory[]).map((cat) => (
            <div key={cat}>
              <div style={categoryTitleStyle}>
                <span>{CATEGORY_ICONS[cat] ?? "📦"}</span>
                <span>{cat}</span>
                <span style={{ fontSize: 10, color: "var(--oslife-text-mute)", marginInlineStart: "auto" }}>
                  {grouped[cat]?.length ?? 0}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(grouped[cat] ?? []).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleChecked(item.key)}
                    style={groceryItemStyle(checked.has(item.key), item.inPantry)}
                  >
                    <span style={chkStyle(checked.has(item.key))}>{checked.has(item.key) ? "✓" : ""}</span>
                    <span style={{ flex: 1, textAlign: "start" }}>{item.name}</span>
                    {item.inPantry && (
                      <span style={inPantryBadgeStyle}>במלאי</span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>
                      {formatAmount(item.amount, item.unit)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function groupByCategory(items: GroceryItem[]): Partial<Record<PantryCategory, GroceryItem[]>> {
  const out: Partial<Record<PantryCategory, GroceryItem[]>> = {};
  for (const item of items) {
    if (!out[item.category]) out[item.category] = [];
    out[item.category]!.push(item);
  }
  return out;
}

function formatAmount(amount: number, unit: string): string {
  const display = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  return unit ? `${display} ${unit}` : display;
}

function StatChip({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={statChipStyle}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "var(--oslife-text-strong)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--oslife-text-mute)", marginTop: 4 }}>{label}</div>
    </div>
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
  background: "rgba(167,139,250,0.16)",
  border: "1px solid rgba(167,139,250,0.32)",
  color: "#A78BFA",
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
const statsRowStyle: React.CSSProperties = { display: "flex", gap: 10, marginBottom: 14 };
const statChipStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--oslife-chip-border)",
  borderRadius: 12,
  padding: 12,
};
const categoryTitleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--oslife-text-mute)",
  letterSpacing: "0.05em",
  paddingBottom: 6,
  marginBottom: 6,
  borderBottom: "1px solid var(--oslife-chip-border)",
};
function groceryItemStyle(isChecked: boolean, inPantry: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid var(--oslife-chip-border)",
    fontSize: 12.5,
    color: isChecked ? "var(--oslife-text-mute)" : inPantry ? "var(--oslife-text-mid)" : "var(--oslife-text-strong)",
    textDecoration: isChecked ? "line-through" : "none",
    opacity: isChecked ? 0.5 : 1,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
function chkStyle(done: boolean): React.CSSProperties {
  return {
    width: 16,
    height: 16,
    borderRadius: 5,
    border: `1.5px solid ${done ? "#34D399" : "rgba(255,255,255,0.15)"}`,
    background: done ? "#34D399" : "transparent",
    color: "#0B0D24",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
  };
}
const inPantryBadgeStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.05em",
  padding: "1px 6px",
  borderRadius: 999,
  background: "rgba(52,211,153,0.12)",
  color: "#34D399",
  border: "1px solid rgba(52,211,153,0.26)",
};
const emptyStateStyle: React.CSSProperties = {
  padding: "36px 0",
  textAlign: "center",
  color: "var(--oslife-text-mute)",
  fontSize: 13,
};
