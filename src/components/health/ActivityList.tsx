import { useState } from "react";
import { useActivities, type ActivityType, type ActivityEntry } from "@/hooks/useActivities";
import { useStrava } from "@/hooks/useStrava";

const TYPE_ICONS: Record<ActivityType, string> = {
  "כדורסל": "🏀",
  "טניס": "🎾",
  "ריצה": "🏃",
  "כושר": "💪",
  "אופניים": "🚴",
  "שחייה": "🏊",
  "אחר": "🏋️",
};

const TYPES: ActivityType[] = ["כדורסל", "טניס", "ריצה", "כושר", "אופניים", "שחייה", "אחר"];

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; activity: ActivityEntry };

export function ActivityList() {
  const { activities, loading, error, isConfigMissing, isSample, addActivity, updateActivity, removeActivity, isMutating } = useActivities();
  const strava = useStrava();
  const [modal, setModal] = useState<ModalState | null>(null);

  const merged = mergeActivities(activities, strava.activities);

  return (
    <section className="glass" style={{ padding: 20 }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <h3 className="card-title">פעילות אחרונה</h3>
        {strava.connected && <span className="label-cap" style={{ color: "#FC4C02" }}>🚴 Strava</span>}
      </div>

      {isConfigMissing && (
        <div style={configStyle}>
          ⚙️ פעילויות דוגמה. הוסף <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>VITE_NOTION_ACTIVITY_DB_ID</code> ב-Vercel.
        </div>
      )}
      {error && <div style={errorStyle}>⚠️ {error}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setModal({ mode: "add" })}
          disabled={isSample}
          style={primaryBtnStyle}
        >
          + רישום פעילות
        </button>
      </div>

      {loading ? (
        <div style={emptyStateStyle}>טוען פעילויות…</div>
      ) : merged.length === 0 ? (
        <div style={emptyStateStyle}>אין פעילויות עדיין</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {merged.slice(0, 10).map((a) => (
            <ActivityRow
              key={`${a.source}-${a.id}`}
              activity={a}
              isSample={isSample}
              isMutating={isMutating}
              onEdit={() => {
                if (a.source === "notion") {
                  setModal({
                    mode: "edit",
                    activity: activities.find((x) => x.id === a.id) ?? activities[0],
                  });
                }
              }}
              onDelete={async () => {
                if (a.source !== "notion") return;
                if (window.confirm(`למחוק את "${a.title}"?`)) {
                  await removeActivity(a.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {modal?.mode === "add" && (
        <AddActivityModal
          isMutating={isMutating}
          onClose={() => setModal(null)}
          onAdd={async (input) => {
            await addActivity(input);
            setModal(null);
          }}
        />
      )}
      {modal?.mode === "edit" && (
        <AddActivityModal
          isMutating={isMutating}
          initial={modal.activity}
          onClose={() => setModal(null)}
          onAdd={async (input) => {
            await updateActivity(modal.activity.id, input);
            setModal(null);
          }}
        />
      )}
    </section>
  );
}

type MergedActivity = {
  id: string;
  date: string;
  type: ActivityType;
  title: string;
  durationMin: number;
  kcal: number;
  source: ActivityEntry["source"];
};

function mergeActivities(notion: ActivityEntry[], strava: ReturnType<typeof useStrava>["activities"]): MergedActivity[] {
  const out: MergedActivity[] = [];
  for (const a of notion) {
    out.push({
      id: a.id,
      date: a.date,
      type: a.type,
      title: a.title,
      durationMin: a.durationMin,
      kcal: a.kcal,
      source: a.source,
    });
  }
  for (const s of strava) {
    out.push({
      id: s.id,
      date: s.date,
      type: ((TYPES as string[]).includes(s.type) ? s.type : "אחר") as ActivityType,
      title: s.title,
      durationMin: s.durationMin,
      kcal: s.kcal,
      source: "strava",
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function ActivityRow({
  activity,
  isSample,
  isMutating,
  onEdit,
  onDelete,
}: {
  activity: MergedActivity;
  isSample: boolean;
  isMutating: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const icon = TYPE_ICONS[activity.type] ?? "🏋️";
  const today = new Date().toISOString().slice(0, 10);
  const dateLabel = activity.date === today
    ? "היום"
    : new Date(activity.date).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  const editable = activity.source === "notion" && !isSample;

  return (
    <div style={rowStyle}>
      <div style={iconStyle}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--oslife-text-strong)", overflow: "hidden", textOverflow: "ellipsis" }}>
          {activity.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--oslife-text-mute)", marginTop: 2 }}>
          {dateLabel} · {activity.type}
        </div>
        {activity.source === "strava" && (
          <div style={{ fontSize: 9, color: "#FC4C02", fontWeight: 600, marginTop: 2 }}>🚴 סונכרן מ-Strava</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--oslife-text-strong)", fontFamily: "JetBrains Mono, monospace" }}>
          {Math.floor(activity.durationMin / 60)}:{String(activity.durationMin % 60).padStart(2, "0")}
        </span>
        {activity.kcal > 0 && (
          <span style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>{activity.kcal} קק"ל</span>
        )}
      </div>
      {editable && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginInlineStart: 6 }}>
          <button type="button" onClick={onEdit} disabled={isMutating} style={iconBtnStyle} aria-label="ערוך פעילות" title="ערוך">
            <PencilIcon />
          </button>
          <button type="button" onClick={onDelete} disabled={isMutating} style={{ ...iconBtnStyle, color: "#FB7185" }} aria-label="מחק פעילות" title="מחק">
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function AddActivityModal({
  isMutating,
  initial,
  onClose,
  onAdd,
}: {
  isMutating: boolean;
  initial?: ActivityEntry;
  onClose: () => void;
  onAdd: (input: { date: string; type: ActivityType; title: string; durationMin: number; kcal: number; notes: string }) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(initial?.date ?? today);
  const [type, setType] = useState<ActivityType>(initial?.type ?? "כדורסל");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 60);
  const [kcal, setKcal] = useState(initial?.kcal ?? 400);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div role="dialog" aria-modal="true" style={modalOverlayStyle} onClick={onClose}>
      <div className="glass" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--oslife-text-strong)" }}>
            {initial ? "עריכת פעילות" : "רישום פעילות"}
          </h4>
          <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="סגור">✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="תאריך">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="סוג">
            <select value={type} onChange={(e) => setType(e.target.value as ActivityType)} style={inputStyle}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="שם / תיאור">
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="ריצה בפארק / כדורסל בסוכנות…" />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Field label="משך (דקות)">
              <input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="קלוריות">
              <input type="number" value={kcal} onChange={(e) => setKcal(Number(e.target.value))} style={inputStyle} />
            </Field>
          </div>
          <Field label="הערות">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} placeholder="מיקום, פרטנר…" />
          </Field>
          <button
            type="button"
            disabled={isMutating || !title.trim()}
            onClick={() => onAdd({ date, type, title: title.trim(), durationMin, kcal, notes })}
            style={{ ...primaryBtnStyle, padding: "10px 16px", marginTop: 4 }}
          >
            {isMutating ? "שומר…" : initial ? "עדכן" : "שמור"}
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

const primaryBtnStyle: React.CSSProperties = {
  padding: "7px 13px",
  borderRadius: 9,
  background: "rgba(52,211,153,0.14)",
  border: "1px solid rgba(52,211,153,0.32)",
  color: "#34D399",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
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
const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-mute)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
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
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid var(--oslife-chip-border)",
};
const iconStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  background: "rgba(167,139,250,0.10)",
  flexShrink: 0,
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
