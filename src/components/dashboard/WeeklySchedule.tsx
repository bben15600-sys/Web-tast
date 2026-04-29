const DAYS = ["ש", "ו", "ה", "ד", "ג", "ב", "א"];
const TODAY_INDEX = 3; // ד highlighted

type Evt = { title: string; time: string; bg: string; accent: string };
const EVENTS: Evt[] = [
  { title: "פגישה עם הצוות", time: "08:30 – 09:15", bg: "#3B82F6", accent: "#60A5FA" },
  { title: "יום טיפול", time: "11:00 – 12:00", bg: "#9F3D4A", accent: "#FB7185" },
  { title: "אימון טניס", time: "17:30 – 18:30", bg: "#10B981", accent: "#34D399" },
  { title: "שיעור בקורס", time: "20:00 – 21:30", bg: "#8B5CF6", accent: "#A78BFA" },
];

const WeeklySchedule = ({ style }: { style?: React.CSSProperties }) => {
  return (
    <section className="glass" style={style}>
      <div className="card-header">
        <h2 className="card-title">Weekly Schedule</h2>
        <button aria-label="Previous week" className="text-[#B4B8D4] hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div
        className="flex justify-between"
        style={{
          padding: "6px 4px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          marginBottom: 12,
        }}
      >
        {DAYS.map((d, i) => (
          <div key={d} className="flex flex-col items-center gap-1">
            <span
              style={{
                fontSize: 11,
                color: "#6B7094",
                fontWeight: 500,
                letterSpacing: "0.08em",
              }}
            >
              {d}
            </span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: 999,
                background: i === TODAY_INDEX ? "#A78BFA" : "transparent",
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {EVENTS.map((e) => (
          <div
            key={e.title}
            className="evt-block"
            style={
              {
                "--evt-accent": e.accent,
                background: e.bg,
              } as React.CSSProperties
            }
          >
            <div className="flex flex-col items-end">
              <span className="evt-title-block">{e.title}</span>
              <span className="evt-time-block mono">{e.time}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WeeklySchedule;
