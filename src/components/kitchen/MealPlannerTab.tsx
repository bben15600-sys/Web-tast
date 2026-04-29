import { useMemo, useState } from "react";
import { useMealPlan, type MealSlot, type MealPlanEntry } from "@/hooks/useMealPlan";
import type { Recipe } from "@/hooks/useRecipes";

const SLOTS: MealSlot[] = ["בוקר", "צהריים", "ערב"];
const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()} ${["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"][d.getMonth()]}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

export function MealPlannerTab({ recipes }: { recipes: Recipe[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const baseStart = useMemo(() => {
    const d = startOfWeekSunday(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const { entries, loading, error, isSample, isConfigMissing, addEntry, removeEntry, isMutating } = useMealPlan(baseStart);

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const grid = useMemo(() => buildGrid(entries, baseStart), [entries, baseStart]);

  const todayIso = isoDate(new Date());

  const [editing, setEditing] = useState<{ date: string; slot: MealSlot } | null>(null);

  const totalsForWeek = useMemo(() => entries.length, [entries]);

  return (
    <section className="glass" style={{ padding: 20 }}>
      <div className="card-header" style={{ marginBottom: 14 }}>
        <h3 className="card-title">תכנון ארוחות שבועי</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((x) => x - 1)}
            style={navBtnStyle}
            aria-label="שבוע קודם"
          >
            →
          </button>
          <span style={{ fontSize: 12, color: "var(--oslife-text-mid)", minWidth: 110, textAlign: "center" }}>
            {formatRange(baseStart)}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((x) => x + 1)}
            style={navBtnStyle}
            aria-label="שבוע הבא"
          >
            ←
          </button>
        </div>
      </div>

      {isConfigMissing && (
        <div style={configMissingStyle}>
          ⚙️ מוצגות ארוחות דוגמה. הוסף <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>VITE_NOTION_MEALPLAN_DB_ID</code> כדי לנהל תכנון ארוחות מ-Notion.
        </div>
      )}

      {error && (
        <div style={errorStyle}>⚠️ {error}</div>
      )}

      <div style={statsRowStyle}>
        <StatChip value={String(totalsForWeek)} label="ארוחות בשבוע" />
        <StatChip value={String(entries.filter((e) => e.recipeId).length)} label="עם מתכון משויך" />
        <StatChip value={String(7 * SLOTS.length - totalsForWeek)} label="חסרות לתכנון" color="var(--oslife-text-mute)" />
      </div>

      <div style={weekGridStyle}>
        {DAY_LABELS.map((label, dayIdx) => {
          const date = new Date(baseStart);
          date.setDate(date.getDate() + dayIdx);
          const dateIso = isoDate(date);
          const isToday = dateIso === todayIso;
          return (
            <div key={dayIdx} style={dayColStyle}>
              <div style={{ ...dayLabelStyle, color: isToday ? "#E89A7D" : "var(--oslife-text-mute)" }}>
                {label}
                <div style={{ fontSize: 10, fontWeight: 400 }}>{date.getDate()}</div>
              </div>
              {SLOTS.map((slot) => {
                const entry = grid[`${dateIso}|${slot}`];
                const recipe = entry?.recipeId ? recipeById.get(entry.recipeId) : null;
                return (
                  <div
                    key={slot}
                    style={mealSlotStyle(Boolean(entry))}
                    onClick={() => setEditing({ date: dateIso, slot })}
                    role="button"
                    tabIndex={0}
                    aria-label={`${label} ${slot}`}
                  >
                    <div style={mealTypeStyle}>{slot}</div>
                    {entry ? (
                      <>
                        <div style={mealNameStyle}>{recipe?.name ?? entry.recipeName ?? entry.notes ?? "—"}</div>
                        {recipe?.totalMin && (
                          <div style={mealMetaStyle}>{recipe.totalMin} דק׳</div>
                        )}
                      </>
                    ) : (
                      <div style={addSlotStyle}>+</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {loading && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--oslife-text-mute)", textAlign: "center" }}>
          טוען תכנון…
        </div>
      )}

      {editing && (
        <SlotEditor
          date={editing.date}
          slot={editing.slot}
          recipes={recipes}
          existingEntry={grid[`${editing.date}|${editing.slot}`] ?? null}
          isMutating={isMutating}
          onClose={() => setEditing(null)}
          onAdd={async (input) => {
            await addEntry(input);
            setEditing(null);
          }}
          onRemove={async (entryId) => {
            await removeEntry(entryId);
            setEditing(null);
          }}
          isSample={isSample}
        />
      )}
    </section>
  );
}

function buildGrid(entries: MealPlanEntry[], weekStart: Date): Record<string, MealPlanEntry> {
  const out: Record<string, MealPlanEntry> = {};
  const start = isoDate(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  const endIso = isoDate(end);
  for (const e of entries) {
    if (e.date < start || e.date >= endIso) continue;
    out[`${e.date}|${e.slot}`] = e;
  }
  return out;
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

function SlotEditor({
  date,
  slot,
  recipes,
  existingEntry,
  isMutating,
  isSample,
  onClose,
  onAdd,
  onRemove,
}: {
  date: string;
  slot: MealSlot;
  recipes: Recipe[];
  existingEntry: MealPlanEntry | null;
  isMutating: boolean;
  isSample: boolean;
  onClose: () => void;
  onAdd: (input: { date: string; slot: MealSlot; recipeId?: string; recipeName?: string; notes?: string }) => Promise<void>;
  onRemove: (entryId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes.slice(0, 12);
    return recipes.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 12);
  }, [search, recipes]);

  return (
    <div role="dialog" aria-modal="true" style={modalOverlayStyle} onClick={onClose}>
      <div className="glass" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--oslife-text-strong)" }}>
            {slot} · {date}
          </h4>
          <button type="button" onClick={onClose} style={navBtnStyle} aria-label="סגור">✕</button>
        </div>

        {existingEntry && (
          <div style={{ ...errorStyle, background: "rgba(167,139,250,0.08)", borderColor: "rgba(167,139,250,0.28)", color: "#A78BFA", marginBottom: 12 }}>
            ארוחה מתוכננת: {existingEntry.recipeName ?? existingEntry.notes ?? "—"}
            <button
              type="button"
              onClick={() => onRemove(existingEntry.id)}
              disabled={isMutating || isSample}
              style={{ ...primaryBtnStyle, marginInlineStart: 12, padding: "4px 10px", fontSize: 11 }}
            >
              {isMutating ? "מסיר…" : "הסר"}
            </button>
          </div>
        )}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מתכון…"
          style={searchInputStyle}
          autoFocus
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: 320, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 18, textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 12 }}>
              לא נמצאו מתכונים
            </div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={isMutating || isSample}
                onClick={() => onAdd({ date, slot, recipeId: r.id, recipeName: r.name })}
                style={recipeOptionStyle}
              >
                <span style={{ fontWeight: 600, color: "var(--oslife-text-strong)" }}>{r.name}</span>
                <span style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>
                  {r.totalMin} דק׳ · {r.servings} מנות
                </span>
              </button>
            ))
          )}
        </div>

        {isSample && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--oslife-text-mute)", textAlign: "center" }}>
            מצב דוגמה — שינויים לא נשמרים
          </div>
        )}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--oslife-text-mid)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  background: "rgba(201,100,66,0.16)",
  border: "1px solid rgba(201,100,66,0.32)",
  color: "#E89A7D",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
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

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 14,
};

const statChipStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--oslife-chip-border)",
  borderRadius: 12,
  padding: 12,
};

const weekGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const dayColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const dayLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textAlign: "center",
  letterSpacing: "0.05em",
  paddingBottom: 4,
  borderBottom: "1px solid var(--oslife-chip-border)",
};

function mealSlotStyle(filled: boolean): React.CSSProperties {
  return {
    background: filled ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.02)",
    border: `1px solid ${filled ? "rgba(167,139,250,0.22)" : "var(--oslife-chip-border)"}`,
    borderRadius: 10,
    padding: "8px 6px",
    minHeight: 64,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    transition: "border-color 0.15s",
  };
}

const mealTypeStyle: React.CSSProperties = {
  fontSize: 9,
  color: "var(--oslife-text-mute)",
  fontWeight: 600,
  letterSpacing: "0.04em",
};
const mealNameStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--oslife-text-mid)",
  fontWeight: 500,
  lineHeight: 1.3,
};
const mealMetaStyle: React.CSSProperties = {
  fontSize: 9,
  color: "var(--oslife-text-mute)",
  marginTop: "auto",
};
const addSlotStyle: React.CSSProperties = {
  fontSize: 18,
  color: "var(--oslife-text-mute)",
  textAlign: "center",
  margin: "auto",
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
  width: "min(100%, 460px)",
  padding: 20,
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
};
const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  background: "var(--oslife-chip)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-strong)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};
const recipeOptionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--oslife-chip-border)",
  cursor: "pointer",
  textAlign: "start",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};
