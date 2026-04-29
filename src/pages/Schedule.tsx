import { useMemo, useState } from "react";
import AppShell from "@/components/dashboard/AppShell";
import { useScheduleEvents, type ScheduleDay, type ScheduleEvent } from "@/hooks/useScheduleEvents";

const Schedule = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const { data, isLoading, isError, error, databaseId } = useScheduleEvents({ weekStart });

  return (
    <AppShell>
      <h1 className="sr-only">לוח שבועי</h1>

      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">לוח שבועי</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="text-[#B4B8D4] hover:text-white transition-colors"
              aria-label="שבוע קודם"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              className="text-[#B4B8D4] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-default"
              style={{ fontSize: 12, minWidth: 160, textAlign: "center" }}
              aria-label="חזור לשבוע הנוכחי"
            >
              {data?.weekRangeLabel ?? "—"}
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="text-[#B4B8D4] hover:text-white transition-colors"
              aria-label="שבוע הבא"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {!databaseId ? (
          <ConfigMissing />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />
        ) : isLoading || !data ? (
          <LoadingState />
        ) : (
          <WeekGrid days={data.days} events={data.events} />
        )}
      </section>

      <style>{`
        .week-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .week-grid { grid-template-columns: repeat(7, 1fr); }
        }
      `}</style>
    </AppShell>
  );
};

function WeekGrid({ days, events }: { days: ScheduleDay[]; events: ScheduleEvent[][] }) {
  return (
    <div className="week-grid">
      {days.map((d, i) => (
        <div key={d.iso} className="flex flex-col gap-3">
          <div
            className="flex flex-col items-center gap-1"
            style={{
              padding: "8px 0",
              borderRadius: 12,
              background: d.today ? "rgba(167,139,250,0.12)" : "transparent",
              border: d.today ? "1px solid rgba(167,139,250,0.30)" : "1px solid transparent",
            }}
          >
            <span style={{ fontSize: 11, color: "#6B7094", letterSpacing: "0.08em", fontWeight: 500 }}>{d.name}</span>
            <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: d.today ? "#A78BFA" : "#F5F6FF" }}>
              {d.date}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {events[i].length === 0 ? (
              <div style={{ fontSize: 11, color: "#6B7094", textAlign: "center", padding: "12px 0" }}>
                אין אירועים
              </div>
            ) : (
              events[i].map((e) => (
                <div
                  key={e.id}
                  className="evt-block"
                  style={{ background: e.bg, ["--evt-accent" as string]: e.accent } as React.CSSProperties}
                >
                  <div className="flex flex-col items-end">
                    <span className="evt-title-block">{e.title}</span>
                    <span className="evt-time-block mono">{e.time}</span>
                    {e.loc && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{e.loc}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#6B7094", fontSize: 13 }}>
      טוען אירועים מ-Notion…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: "32px 0", textAlign: "center", color: "#FB7185", fontSize: 13 }}>
      שגיאה בטעינת האירועים: {message}
    </div>
  );
}

function ConfigMissing() {
  return (
    <div style={{ padding: "32px 0", textAlign: "center", color: "#B4B8D4", fontSize: 13, lineHeight: 1.6 }}>
      לא הוגדר <code style={{ color: "#A78BFA" }}>VITE_NOTION_SCHEDULE_DB_ID</code>.<br />
      העתק את <code style={{ color: "#A78BFA" }}>.env.example</code> ל-<code style={{ color: "#A78BFA" }}>.env.local</code> ומלא את מזהה ה-database.
    </div>
  );
}

export default Schedule;
