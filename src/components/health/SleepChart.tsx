import { useMemo, useState } from "react";
import { useSleep, type SleepEntry, type SleepQuality } from "@/hooks/useSleep";
import { averageSleepLastWeek } from "@/lib/healthStats";

const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const QUALITY_COLORS: Record<string, string> = {
  "מצוין": "#34D399",
  "טוב": "#34D399",
  "בינוני": "#FBBF24",
  "גרוע": "#FB7185",
};
const QUALITIES: SleepQuality[] = ["מצוין", "טוב", "בינוני", "גרוע"];

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

export function SleepChart() {
  const { entries, loading, error, isConfigMissing, isSample, averageHours, addEntry, updateEntry, removeEntry, isMutating } = useSleep();
  const [editing, setEditing] = useState<{ date: string; existing: SleepEntry | null } | null>(null);

  const stats = useMemo(() => averageSleepLastWeek(entries), [entries]);
  const weekDays = useMemo(() => buildWeek(entries), [entries]);

  return (
    <section className="glass" style={{ padding: 20 }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <h3 className="card-title">שינה שבועית</h3>
        <span className="label-cap">ממוצע {averageHours} ש׳</span>
      </div>

      {isConfigMissing && (
        <div style={configStyle}>
          ⚙️ נתוני שינה דוגמה. הוסף <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>VITE_NOTION_SLEEP_DB_ID</code>.
        </div>
      )}
      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {loading ? (
        <div style={emptyStateStyle}>טוען נתוני שינה…</div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: "var(--oslife-text-mute)", marginBottom: 6 }}>
            הקש על יום כדי לערוך
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {weekDays.map((day) => (
              <SleepRow
                key={day.date}
                day={day}
                disabled={isSample}
                onClick={() => setEditing({ date: day.date, existing: day.entry })}
              />
            ))}
          </div>
        </>
      )}

      {stats.worstDay && stats.worstDay.hours < 6 && (
        <div style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(167,139,250,0.06)",
          border: "1px solid rgba(167,139,250,0.18)",
          fontSize: 11.5,
          color: "var(--oslife-text-mute)",
        }}>
          💡 ב-{new Date(stats.worstDay.date).toLocaleDateString("he-IL", { weekday: "long" })} ישנת רק {stats.worstDay.hours} שעות
        </div>
      )}

      {editing && (
        <SleepEditModal
          date={editing.date}
          existing={editing.existing}
          isMutating={isMutating}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing.existing) {
              await updateEntry(editing.existing.id, input);
            } else {
              await addEntry(input);
            }
            setEditing(null);
          }}
          onDelete={async () => {
            if (!editing.existing) return;
            if (window.confirm(`למחוק את רישום השינה ל-${editing.date}?`)) {
              await removeEntry(editing.existing.id);
              setEditing(null);
            }
          }}
        />
      )}
    </section>
  );
}

function SleepEditModal({
  date,
  existing,
  isMutating,
  onClose,
  onSave,
  onDelete,
}: {
  date: string;
  existing: SleepEntry | null;
  isMutating: boolean;
  onClose: () => void;
  onSave: (input: { date: string; hours: number; quality: SleepQuality }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [hours, setHours] = useState<string>(existing ? String(existing.hours) : "7.5");
  const [quality, setQuality] = useState<SleepQuality>(existing?.quality ?? "טוב");

  const numericHours = Number(hours);
  const valid = Number.isFinite(numericHours) && numericHours > 0 && numericHours <= 24;

  const dayName = new Date(date).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100, backdropFilter: "blur(4px)",
    }}>
      <div className="glass" onClick={(e) => e.stopPropagation()} style={{
        width: "min(100%, 380px)", padding: 20, maxHeight: "calc(100vh - 32px)", overflowY: "auto",
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--oslife-text-strong)" }}>
            {existing ? "עריכת שינה" : "הוסף שינה"} — {dayName}
          </h4>
          <button type="button" onClick={onClose} style={modalCloseBtnStyle} aria-label="סגור">✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--oslife-text-mute)", fontWeight: 600 }}>שעות שינה</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              autoFocus
              style={modalInputStyle}
            />
          </label>

          <div>
            <span style={{ fontSize: 11, color: "var(--oslife-text-mute)", fontWeight: 600, display: "block", marginBottom: 6 }}>איכות</span>
            <div style={{ display: "flex", gap: 6 }}>
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    borderRadius: 8,
                    background: quality === q ? `${QUALITY_COLORS[q]}1A` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${quality === q ? QUALITY_COLORS[q] + "55" : "var(--oslife-chip-border)"}`,
                    color: quality === q ? QUALITY_COLORS[q] : "var(--oslife-text-mid)",
                    fontSize: 11.5,
                    fontWeight: quality === q ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              disabled={isMutating || !valid}
              onClick={() => onSave({ date, hours: numericHours, quality })}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 9,
                background: "rgba(167,139,250,0.16)",
                border: "1px solid rgba(167,139,250,0.32)",
                color: "#A78BFA",
                fontSize: 13,
                fontWeight: 700,
                cursor: valid && !isMutating ? "pointer" : "not-allowed",
                opacity: valid ? 1 : 0.5,
                fontFamily: "inherit",
              }}
            >
              {isMutating ? "שומר…" : existing ? "עדכן" : "שמור"}
            </button>
            {existing && (
              <button
                type="button"
                disabled={isMutating}
                onClick={onDelete}
                style={{
                  padding: "10px 14px",
                  borderRadius: 9,
                  background: "rgba(251,113,133,0.10)",
                  border: "1px solid rgba(251,113,133,0.28)",
                  color: "#FB7185",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                מחק
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type DayRow = {
  label: string;
  date: string;
  hours: number | null;
  quality: SleepEntry["quality"] | null;
  entry: SleepEntry | null;
};

function buildWeek(entries: SleepEntry[]): DayRow[] {
  const start = startOfWeekSunday(new Date());
  const out: DayRow[] = [];
  const byDate = new Map(entries.map((e) => [e.date, e]));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const e = byDate.get(iso) ?? null;
    out.push({
      label: DAY_LABELS[i],
      date: iso,
      hours: e?.hours ?? null,
      quality: e?.quality ?? null,
      entry: e,
    });
  }
  return out;
}

function SleepRow({ day, disabled, onClick }: { day: DayRow; disabled: boolean; onClick: () => void }) {
  const fillPct = day.hours != null ? Math.min((day.hours / 9) * 100, 100) : 0;
  const color = day.quality ? QUALITY_COLORS[day.quality] : "var(--oslife-text-mute)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 6px",
        borderBottom: "1px solid var(--oslife-chip-border)",
        background: "transparent",
        border: "none",
        borderInline: "none",
        cursor: disabled ? "default" : "pointer",
        textAlign: "start",
        fontFamily: "inherit",
        color: "inherit",
        borderRadius: 6,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "rgba(167,139,250,0.05)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 11, color: "var(--oslife-text-mute)", width: 24, fontWeight: 600 }}>{day.label}</span>
      <div style={{
        flex: 1,
        height: 8,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 999,
        overflow: "hidden",
      }}>
        {day.hours != null && (
          <div style={{
            height: "100%",
            width: `${fillPct}%`,
            background: "linear-gradient(to left, #A78BFA, rgba(167,139,250,0.4))",
            borderRadius: 999,
            transition: "width 0.4s",
          }} />
        )}
      </div>
      <span style={{
        fontSize: 11,
        color: "var(--oslife-text-mid)",
        width: 36,
        textAlign: "end",
        fontFamily: "JetBrains Mono, monospace",
      }}>
        {day.hours != null ? day.hours.toFixed(1) : "—"}
      </span>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: day.quality ? color : "transparent",
        border: day.quality ? "none" : "1px dashed var(--oslife-chip-border)",
        flexShrink: 0,
      }} />
    </button>
  );
}

const modalInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 9,
  background: "var(--oslife-chip)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-strong)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};
const modalCloseBtnStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--oslife-text-mid)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

const configStyle: React.CSSProperties = {
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
  padding: 24,
  textAlign: "center",
  color: "var(--oslife-text-mute)",
  fontSize: 13,
};
