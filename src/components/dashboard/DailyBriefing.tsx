import { useState } from "react";
import { Link } from "react-router-dom";
import { useDailyBriefing } from "@/hooks/useDailyBriefing";
import { useDailyInsight } from "@/hooks/useDailyInsight";
import type {
  BriefingAlert,
  BriefingAlertIcon,
  BriefingAlertSeverity,
  LookaheadDay,
} from "@/lib/dailyBriefing";

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const HEBREW_DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function greetingFor(part: "morning" | "afternoon" | "evening"): string {
  return part === "morning" ? "בוקר טוב" : part === "afternoon" ? "צהריים טובים" : "ערב טוב";
}

function formatHebrewDate(d: Date): string {
  return `${HEBREW_DAY_NAMES[d.getDay()]}, ${d.getDate()} ב${HEBREW_MONTHS[d.getMonth()]}`;
}

export function DailyBriefing({ userName }: { userName?: string }) {
  const { briefing, isLoading } = useDailyBriefing();
  const insight = useDailyInsight(briefing.insightContext);

  const now = new Date();
  const greeting = greetingFor(briefing.insightContext.greetingPart);

  return (
    <section className="briefing stage" style={{ marginBottom: 24 }}>
      <BriefingHero
        greeting={greeting}
        userName={userName}
        date={formatHebrewDate(now)}
        todayEventCount={briefing.hero.todayEventCount}
        goalsDone={briefing.hero.goalsDone}
        goalsTotal={briefing.hero.goalsTotal}
        budgetPercent={briefing.hero.budgetPercent}
      />

      <InsightCard
        text={insight.insight}
        isLoading={insight.isLoading}
        error={insight.error}
        hasContext={
          (briefing.insightContext.todayEvents?.length ?? 0) > 0 ||
          Boolean(briefing.insightContext.budget) ||
          Boolean(briefing.insightContext.market)
        }
      />

      {briefing.alerts.length > 0 && (
        <AlertsList alerts={briefing.alerts} />
      )}

      {briefing.lookahead.length > 0 && (
        <LookaheadCard
          days={briefing.lookahead}
          eventsTotal={briefing.weekStats.eventsTotal}
          estimatedHours={briefing.weekStats.estimatedHours}
          recurringBillsTotal={briefing.weekStats.recurringBillsTotal}
        />
      )}

      {isLoading && briefing.alerts.length === 0 && (
        <div
          style={{
            padding: "12px 16px",
            color: "var(--oslife-text-mute)",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          טוען נתונים…
        </div>
      )}

      <style>{`
        .briefing > * + * { margin-top: 14px; }
      `}</style>
    </section>
  );
}

function BriefingHero({
  greeting,
  userName,
  date,
  todayEventCount,
  goalsDone,
  goalsTotal,
  budgetPercent,
}: {
  greeting: string;
  userName?: string;
  date: string;
  todayEventCount: number | null;
  goalsDone: number;
  goalsTotal: number;
  budgetPercent: number | null;
}) {
  return (
    <header
      className="flex items-baseline justify-between"
      style={{ flexWrap: "wrap", gap: 12 }}
    >
      <div>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--oslife-text-strong)",
            lineHeight: 1.1,
          }}
        >
          {greeting}{userName ? `, ${userName}` : ""}
        </h2>
        <p style={{ fontSize: 12, color: "var(--oslife-text-mute)", marginTop: 4 }}>{date}</p>
      </div>
      <div className="flex items-center gap-5">
        {todayEventCount !== null && (
          <span style={{ fontSize: 12, color: "var(--oslife-text-mid)" }}>
            <span className="mono" style={{ color: "var(--oslife-text-strong)", fontWeight: 600 }}>
              {todayEventCount}
            </span>{" "}
            אירועים היום
          </span>
        )}
        {goalsTotal > 0 && (
          <span style={{ fontSize: 12, color: "var(--oslife-text-mid)" }}>
            <span className="mono" style={{ color: "var(--oslife-text-strong)", fontWeight: 600 }}>
              {goalsDone}/{goalsTotal}
            </span>{" "}
            יעדים
          </span>
        )}
        {budgetPercent !== null && (
          <span style={{ fontSize: 12, color: "var(--oslife-text-mid)" }}>
            <span className="mono" style={{ color: "var(--oslife-text-strong)", fontWeight: 600 }}>
              {budgetPercent}%
            </span>{" "}
            תקציב
          </span>
        )}
      </div>
    </header>
  );
}

function InsightCard({
  text,
  isLoading,
  error,
  hasContext,
}: {
  text: string | null;
  isLoading: boolean;
  error: string | null;
  hasContext: boolean;
}) {
  if (!hasContext && !isLoading) return null;

  return (
    <section
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(167,139,250,0.18) 0%, transparent 55%)," +
          "radial-gradient(120% 140% at 100% 100%, rgba(96,165,250,0.14) 0%, transparent 55%)," +
          "var(--oslife-surface)",
        border: "1px solid rgba(167,139,250,0.22)",
        borderRadius: 22,
        padding: "20px 24px",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "radial-gradient(circle at 30% 25%, #C4B5FD 0%, #8B5CF6 70%)",
            boxShadow:
              "0 8px 28px rgba(167,139,250,0.50), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        />
        <div className="briefing-orb-pulse" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="label-cap"
          style={{ color: "#C4B5FD", marginBottom: 6 }}
        >
          סיכום יומי · Claude
        </div>
        {text ? (
          <p
            style={{
              fontFamily: '"Frank Ruhl Libre", "Fraunces", Georgia, serif',
              fontSize: 17,
              lineHeight: 1.65,
              color: "var(--oslife-text-strong)",
              margin: 0,
            }}
          >
            {text}
          </p>
        ) : isLoading ? (
          <p
            style={{
              fontFamily: '"Frank Ruhl Libre", "Fraunces", Georgia, serif',
              fontSize: 17,
              lineHeight: 1.65,
              color: "var(--oslife-text-mute)",
              margin: 0,
            }}
          >
            כותב לך סיכום…
          </p>
        ) : error ? (
          <p style={{ fontSize: 13, color: "var(--oslife-text-mute)", margin: 0 }}>
            לא הצלחתי לכתוב סיכום ({error}). שאר המידע למטה זמין.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "var(--oslife-text-mute)", margin: 0 }}>
            אין מספיק נתונים לסיכום היום.
          </p>
        )}
      </div>
      <style>{`
        .briefing-orb-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 999px;
          border: 1px solid rgba(167,139,250,0.4);
          animation: briefing-pulse 2.6s cubic-bezier(0.16,1,0.3,1) infinite;
          pointer-events: none;
        }
        @keyframes briefing-pulse {
          0%   { opacity: 0.7; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.45); }
        }
      `}</style>
    </section>
  );
}

function AlertsList({ alerts }: { alerts: BriefingAlert[] }) {
  return (
    <section className="glass">
      <div className="card-header">
        <h3 className="card-title">התראות חכמות</h3>
        <span className="label-cap">{alerts.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((a) => (
          <AlertRow key={a.id} alert={a} />
        ))}
      </div>
    </section>
  );
}

function AlertRow({ alert }: { alert: BriefingAlert }) {
  const color = colorForSeverity(alert.severity);
  const content = (
    <>
      <span
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
          color,
          flexShrink: 0,
        }}
      >
        {iconFor(alert.icon)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--oslife-text-strong)",
            lineHeight: 1.3,
          }}
        >
          {alert.title}
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: "var(--oslife-text-mid)",
            lineHeight: 1.4,
          }}
        >
          {alert.detail}
        </p>
      </div>
    </>
  );
  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderInlineStart: `3px solid ${color}`,
    textDecoration: "none",
    transition: "background 180ms ease, border-color 180ms ease",
  };
  if (alert.href) {
    return (
      <Link to={alert.href} style={wrapperStyle}>
        {content}
      </Link>
    );
  }
  return <div style={wrapperStyle}>{content}</div>;
}

function colorForSeverity(severity: BriefingAlertSeverity): string {
  if (severity === "critical") return "#FB7185";
  if (severity === "warning") return "#FBBF24";
  return "#A78BFA";
}

function iconFor(icon: BriefingAlertIcon) {
  if (icon === "budget") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M16 12h3" />
      </svg>
    );
  }
  if (icon === "market") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 9 11 13 15 21 7" />
      </svg>
    );
  }
  if (icon === "deposit") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (icon === "calendar") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2Z" />
    </svg>
  );
}

function LookaheadCard({
  days,
  eventsTotal,
  estimatedHours,
  recurringBillsTotal,
}: {
  days: LookaheadDay[];
  eventsTotal: number;
  estimatedHours: number;
  recurringBillsTotal: number;
}) {
  const [openDay, setOpenDay] = useState<LookaheadDay | null>(null);

  return (
    <section className="glass">
      <div className="card-header">
        <h3 className="card-title">7 ימים קדימה</h3>
        <span className="label-cap">הקש על יום לפרטים ועריכה</span>
      </div>
      <div className="briefing-ahead">
        {days.map((d) => (
          <LookaheadDayCell key={d.iso} day={d} onClick={() => setOpenDay(d)} />
        ))}
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 12,
          color: "var(--oslife-text-mid)",
        }}
      >
        {recurringBillsTotal > 0 ? (
          <span>
            תזרים חיובים השבוע:{" "}
            <b
              className="mono currency"
              style={{ color: "#FB7185", fontWeight: 700 }}
            >
              -₪{recurringBillsTotal.toLocaleString()}
            </b>
          </span>
        ) : (
          <span>אין חיובים חוזרים השבוע</span>
        )}
        <span>
          {eventsTotal} אירועים · ~{estimatedHours} שעות
        </span>
      </div>

      {openDay && <LookaheadDayModal day={openDay} onClose={() => setOpenDay(null)} />}

      <style>{`
        .briefing-ahead {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          margin-top: 4px;
        }
        .briefing-day {
          padding: 10px 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          text-align: start;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 110px;
          transition: all 200ms ease;
          cursor: pointer;
          font-family: inherit;
          color: inherit;
        }
        .briefing-day:hover, .briefing-day:focus-visible {
          background: rgba(255,255,255,0.06);
          border-color: rgba(167,139,250,0.30);
          outline: none;
        }
        .briefing-day.today {
          background: rgba(167,139,250,0.12);
          border-color: rgba(167,139,250,0.35);
        }
        .briefing-day.heavy {
          border-color: rgba(251,113,133,0.30);
        }
        .briefing-day-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .briefing-day-dow {
          font-size: 10px;
          color: var(--oslife-text-mute);
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .briefing-day.today .briefing-day-dow {
          color: #C4B5FD;
        }
        .briefing-day-num {
          font-size: 18px;
          font-weight: 800;
          color: var(--oslife-text-strong);
          font-family: "JetBrains Mono", monospace;
          line-height: 1;
        }
        .briefing-day.today .briefing-day-num {
          color: #A78BFA;
        }
        .briefing-day-events {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }
        .briefing-day-event {
          font-size: 10.5px;
          color: var(--oslife-text-mid);
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .briefing-day-event-time {
          color: var(--oslife-text-mute);
          margin-inline-end: 3px;
          font-family: "JetBrains Mono", monospace;
          font-size: 9px;
        }
        .briefing-day-more {
          font-size: 9.5px;
          color: var(--oslife-text-mute);
          font-style: italic;
        }
        .briefing-day-empty {
          font-size: 10px;
          color: var(--oslife-text-mute);
          opacity: 0.7;
          font-style: italic;
        }
        .briefing-day-bills {
          font-size: 10px;
          color: #FBBF24;
          font-family: "JetBrains Mono", monospace;
          margin-top: auto;
          padding-top: 4px;
          border-top: 1px solid rgba(251,191,36,0.15);
        }
        @media (max-width: 640px) {
          .briefing-day { min-height: 96px; padding: 8px 6px; }
          .briefing-day-num { font-size: 16px; }
          .briefing-day-event { font-size: 9.5px; }
        }
      `}</style>
    </section>
  );
}

function LookaheadDayCell({ day, onClick }: { day: LookaheadDay; onClick: () => void }) {
  const className = [
    "briefing-day",
    day.isToday ? "today" : "",
    day.density === "heavy" ? "heavy" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const visibleEvents = day.events.slice(0, 2);
  const hiddenCount = day.events.length - visibleEvents.length;

  return (
    <button type="button" className={className} onClick={onClick} aria-label={`פרטים ליום ${day.dom}`}>
      <div className="briefing-day-head">
        <span className="briefing-day-dow">{day.letterHe}</span>
        <span className="briefing-day-num">{day.dom}</span>
      </div>

      <div className="briefing-day-events">
        {visibleEvents.length === 0 ? (
          <span className="briefing-day-empty">ריק</span>
        ) : (
          visibleEvents.map((e) => (
            <span key={e.id} className="briefing-day-event">
              {e.time && <span className="briefing-day-event-time">{e.time}</span>}
              {e.title}
            </span>
          ))
        )}
        {hiddenCount > 0 && (
          <span className="briefing-day-more">+{hiddenCount} עוד</span>
        )}
      </div>

      {day.upcomingBillTotal > 0 && (
        <span className="briefing-day-bills">
          ₪{Math.round(day.upcomingBillTotal).toLocaleString()}
        </span>
      )}
    </button>
  );
}

function LookaheadDayModal({ day, onClose }: { day: LookaheadDay; onClose: () => void }) {
  const dayName = HEBREW_DAY_NAMES[day.date.getDay()];
  const monthName = HEBREW_MONTHS[day.date.getMonth()];
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, zIndex: 100, backdropFilter: "blur(4px)",
    }}>
      <div className="glass" onClick={(e) => e.stopPropagation()} style={{
        width: "min(100%, 460px)", padding: 22, maxHeight: "calc(100vh - 32px)", overflowY: "auto",
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: "var(--oslife-text-strong)" }}>
              יום {dayName}{day.isToday ? " · היום" : ""}
            </h4>
            <div style={{ fontSize: 12, color: "var(--oslife-text-mute)", marginTop: 2 }}>
              {day.dom} {monthName}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור" style={{
            padding: "5px 10px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--oslife-text-mid)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>✕</button>
        </div>

        {/* Events section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "var(--oslife-text-mute)",
            letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>📅 אירועים</span>
            <span style={{
              fontSize: 10, padding: "1px 7px", borderRadius: 999,
              background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.28)",
            }}>{day.events.length}</span>
          </div>
          {day.events.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--oslife-text-mute)", padding: "10px 12px",
              background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px dashed var(--oslife-chip-border)" }}>
              אין אירועים מתוכננים
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {day.events.map((e) => (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--oslife-chip-border)",
                }}>
                  {e.time && (
                    <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                      color: "#A78BFA", fontWeight: 700, minWidth: 42 }}>{e.time}</span>
                  )}
                  <span style={{ fontSize: 13, color: "var(--oslife-text-strong)", flex: 1 }}>{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bills section */}
        {day.bills.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "var(--oslife-text-mute)",
              letterSpacing: "0.05em", marginBottom: 8,
            }}>💸 חיובים חוזרים</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {day.bills.map((b, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 10,
                  background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)",
                }}>
                  <span style={{ fontSize: 13, color: "var(--oslife-text-strong)" }}>{b.name}</span>
                  <span style={{
                    fontSize: 13, fontFamily: "JetBrains Mono, monospace",
                    color: "#FBBF24", fontWeight: 700,
                  }}>−₪{Math.round(b.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action links */}
        <div style={{ display: "flex", gap: 8, marginTop: 18, paddingTop: 14,
          borderTop: "1px solid var(--oslife-chip-border)", flexWrap: "wrap" }}>
          <Link to="/schedule" onClick={onClose} style={{
            flex: 1, minWidth: 120, padding: "9px 14px", borderRadius: 10, textAlign: "center",
            background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.32)",
            color: "#A78BFA", fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>📅 ערוך לוז</Link>
          <Link to="/budget" onClick={onClose} style={{
            flex: 1, minWidth: 120, padding: "9px 14px", borderRadius: 10, textAlign: "center",
            background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.28)",
            color: "#FBBF24", fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>💸 ערוך חיובים</Link>
        </div>
      </div>
    </div>
  );
}

export default DailyBriefing;
