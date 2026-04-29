import { useState } from "react";
import { useKitchenTimers, type KitchenTimer } from "@/hooks/useKitchenTimers";

const QUICK_PRESETS = [
  { label: "30 שניות", sec: 30 },
  { label: "דקה", sec: 60 },
  { label: "3 דק׳", sec: 3 * 60 },
  { label: "5 דק׳", sec: 5 * 60 },
  { label: "10 דק׳", sec: 10 * 60 },
  { label: "20 דק׳", sec: 20 * 60 },
  { label: "45 דק׳", sec: 45 * 60 },
  { label: "שעה", sec: 60 * 60 },
];

export function TimersPanel() {
  const { timers, add, pause, resume, remove, reset, clearAll } = useKitchenTimers();
  const [customMin, setCustomMin] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const handleCustom = () => {
    const mins = Number(customMin);
    if (!Number.isFinite(mins) || mins <= 0) return;
    add(customLabel || `${mins} דקות`, Math.round(mins * 60));
    setCustomMin("");
    setCustomLabel("");
  };

  const sorted = [...timers].sort((a, b) => {
    // Done timers float to top so they're not missed.
    if (a.state === "done" && b.state !== "done") return -1;
    if (b.state === "done" && a.state !== "done") return 1;
    return a.remainingSec - b.remainingSec;
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">טיימר חדש</h2>
          {timers.length > 0 && (
            <button
              type="button"
              onClick={() => { if (confirm("למחוק את כל הטיימרים?")) clearAll(); }}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                color: "var(--oslife-text-mute)",
                background: "transparent",
                border: "1px solid var(--oslife-chip-border)",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              נקה הכל
            </button>
          )}
        </div>

        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.sec}
              type="button"
              onClick={() => add(p.label, p.sec)}
              className="preset-chip"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(201,100,66,0.10)",
                border: "1px solid rgba(201,100,66,0.24)",
                color: "#E89A7D",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div
          className="flex items-center gap-2"
          style={{
            marginTop: 14,
            padding: 10,
            background: "rgba(10,12,28,0.45)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.06)",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="שם (אופציונלי)"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            style={{
              flex: "1 1 140px",
              minWidth: 0,
              padding: "8px 10px",
              background: "var(--oslife-chip)",
              border: "1px solid var(--oslife-chip-border)",
              borderRadius: 8,
              color: "var(--oslife-text-strong)",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <input
            type="number"
            inputMode="numeric"
            min={0.5}
            step={0.5}
            placeholder="דקות"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCustom(); }}
            style={{
              width: 90,
              padding: "8px 10px",
              background: "var(--oslife-chip)",
              border: "1px solid var(--oslife-chip-border)",
              borderRadius: 8,
              color: "var(--oslife-text-strong)",
              fontSize: 13,
              outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: "center",
            }}
          />
          <button
            type="button"
            onClick={handleCustom}
            disabled={!customMin}
            style={{
              padding: "8px 16px",
              background: "#C96442",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: customMin ? "pointer" : "default",
              opacity: customMin ? 1 : 0.5,
              fontFamily: "inherit",
            }}
          >
            התחל
          </button>
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">טיימרים פעילים</h2>
          <span className="label-cap">{timers.length}</span>
        </div>
        {sorted.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 13 }}>
            אין טיימרים פעילים. לחץ על preset למעלה כדי להתחיל.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((t) => (
              <TimerRow
                key={t.id}
                timer={t}
                onPause={() => pause(t.id)}
                onResume={() => resume(t.id)}
                onReset={() => reset(t.id)}
                onRemove={() => remove(t.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TimerRow({
  timer,
  onPause,
  onResume,
  onReset,
  onRemove,
}: {
  timer: KitchenTimer;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const isDone = timer.state === "done";
  const mins = Math.floor(timer.remainingSec / 60);
  const secs = timer.remainingSec % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progress = timer.durationSec > 0
    ? Math.min(100, ((timer.durationSec - timer.remainingSec) / timer.durationSec) * 100)
    : 0;

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: "12px 14px",
        background: isDone ? "rgba(52,211,153,0.08)" : "rgba(10,12,28,0.45)",
        border: `1px solid ${isDone ? "rgba(52,211,153,0.36)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 10,
        position: "relative",
        overflow: "hidden",
        animation: isDone ? "timer-pulse 1.2s ease-in-out infinite" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${progress}%`,
          background: "rgba(201,100,66,0.08)",
          transition: "width 0.5s linear",
          pointerEvents: "none",
        }}
      />
      <div className="flex flex-col flex-1 min-w-0" style={{ zIndex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--oslife-text-strong)" }}>
          {isDone ? `⏰ ${timer.label} — הסתיים!` : timer.label}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: isDone ? "#34D399" : "var(--oslife-text-strong)",
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {timeStr}
        </span>
      </div>
      <div className="flex items-center gap-1" style={{ zIndex: 1 }}>
        {timer.state === "running" && (
          <IconButton onClick={onPause} aria-label="השהה" color="#FBBF24">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </IconButton>
        )}
        {timer.state === "paused" && (
          <IconButton onClick={onResume} aria-label="המשך" color="#34D399">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </IconButton>
        )}
        <IconButton onClick={onReset} aria-label="אפס" color="var(--oslife-text-mid)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 4 3 10 9 10" />
          </svg>
        </IconButton>
        <IconButton onClick={onRemove} aria-label="מחק" color="#FB7185">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </IconButton>
      </div>
      <style>{`
        @keyframes timer-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 0 0 8px rgba(52,211,153,0.12); }
        }
      `}</style>
    </div>
  );
}

function IconButton({
  onClick,
  color,
  children,
  ...rest
}: { onClick: () => void; color: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "transparent",
        border: "1px solid var(--oslife-chip-border)",
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
