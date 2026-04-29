import type { ReactNode } from "react";

const TrendUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
);
const TrendDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 7 9 13 13 9 21 17" />
    <polyline points="14 17 21 17 21 10" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const BarsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="6" />
  </svg>
);
const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M16 12h3" />
    <path d="M3 9c0-1.5 1-3 3-3h11" />
  </svg>
);
const ShoeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17c0-1 .5-1.5 1.5-1.7L8 14l2-6 3 1-1 4 4 1c2 .5 5 1.5 6 4v1H2v-1z" />
  </svg>
);

type Row = {
  trend: ReactNode;
  label: string;
  number: ReactNode;
  glow: string;
  chipBg: string;
  icon: ReactNode;
};

const ROWS: Row[] = [
  {
    trend: <TrendDown />,
    label: "כללי: סה״כ שעות שינה (שבועי)",
    number: (
      <span className="mono currency" style={{ fontSize: 35, fontWeight: 700, color: "#F5F6FF", textShadow: "0 0 24px rgba(96,165,250,0.35)" }}>
        66 <span style={{ fontSize: 20, opacity: 0.6, fontFamily: "Heebo, sans-serif" }}>ה</span> 25
      </span>
    ),
    glow: "rgba(96,165,250,0.35)",
    chipBg: "rgba(96,165,250,0.14)",
    icon: <MoonIcon />,
  },
  {
    trend: <TrendUp />,
    label: "כללי: תשואה חודשית (%)",
    number: (
      <span className="mono currency" style={{ fontSize: 35, fontWeight: 700, color: "#F5F6FF", textShadow: "0 0 24px rgba(251,191,36,0.35)" }}>
        16.4%
      </span>
    ),
    glow: "rgba(251,191,36,0.35)",
    chipBg: "rgba(251,191,36,0.14)",
    icon: <BarsIcon />,
  },
  {
    trend: <TrendDown />,
    label: "פיננסי: הוצאות מול תקציב",
    number: (
      <span className="mono currency" style={{ fontSize: 35, fontWeight: 700, color: "#F5F6FF", textShadow: "0 0 24px rgba(251,113,133,0.35)" }}>
        28,000 ₪
      </span>
    ),
    glow: "rgba(251,113,133,0.35)",
    chipBg: "rgba(251,113,133,0.14)",
    icon: <WalletIcon />,
  },
  {
    trend: <TrendUp />,
    label: "בריאות: צעדים יומיים",
    number: (
      <span className="mono currency" style={{ fontSize: 35, fontWeight: 700, color: "#F5F6FF", textShadow: "0 0 24px rgba(52,211,153,0.35)" }}>
        11,200
      </span>
    ),
    glow: "rgba(52,211,153,0.35)",
    chipBg: "rgba(52,211,153,0.14)",
    icon: <ShoeIcon />,
  },
];

const CentralMetrics = ({ style }: { style?: React.CSSProperties }) => {
  return (
    <section className="glass" style={{ ...style, padding: "24px 28px" }}>
      <div className="card-header">
        <h2 className="card-title">Central Data Metrics</h2>
      </div>

      <div className="flex flex-col">
        {ROWS.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-4"
            style={{
              padding: "18px 0",
              borderBottom: i === ROWS.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {r.trend}
            <span
              className="flex-1 text-start"
              style={{ fontSize: 13, color: "#B4B8D4", maxWidth: "50%" }}
            >
              {r.label}
            </span>
            <div className="flex items-center gap-3 ms-auto">
              {r.number}
              <span className="chip" style={{ background: r.chipBg }}>
                {r.icon}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CentralMetrics;
