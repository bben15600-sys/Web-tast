type Asset = {
  name: string;
  badgePct: string;
  badgeColor: string;
  badgeDown?: boolean;
  sparkColor: string;
  sub: string;
  subColor: string;
  data: number[];
};

const ASSETS: Asset[] = [
  {
    name: "S&P 500",
    badgePct: "4.25%",
    badgeColor: "#34D399",
    sparkColor: "#34D399",
    sub: "+85.26%",
    subColor: "#34D399",
    data: [10, 12, 11, 14, 13, 16, 18, 17, 20, 22, 24, 28],
  },
  {
    name: "NVDA",
    badgePct: "4.80%",
    badgeColor: "#FB7185",
    badgeDown: true,
    sparkColor: "#FBBF24",
    sub: "−5.25%",
    subColor: "#FB7185",
    data: [22, 20, 24, 23, 26, 25, 22, 20, 23, 21, 24, 22],
  } as Asset,
  {
    name: "Cash",
    badgePct: "1.82%",
    badgeColor: "#A78BFA",
    sparkColor: "#A78BFA",
    sub: "+2.15%",
    subColor: "#34D399",
    data: [10, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16],
  },
];

function buildPath(data: number[], w: number, h: number) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as [number, number];
  });

  // monotone-ish smoothing
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const cx = (x1 + x2) / 2;
    d += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }
  return { d, last: points[points.length - 1] };
}

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const w = 110;
  const h = 36;
  const { d, last } = buildPath(data, w, h);
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
};

const InvestmentPortfolio = ({ style }: { style?: React.CSSProperties }) => {
  return (
    <section className="glass" style={style}>
      <div className="card-header">
        <h2 className="card-title">Investment Portfolio</h2>
      </div>

      <div className="flex flex-col gap-[14px]">
        {ASSETS.map((a) => (
          <div key={a.name} className="flex items-center gap-3">
            {/* Badge (left in RTL = end visually) */}
            <div className="flex items-center gap-1" style={{ minWidth: 64 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill={a.badgeColor} style={{ transform: a.badgeDown ? "rotate(180deg)" : undefined }}>
                <path d="M5 1 L9 8 L1 8 Z" />
              </svg>
              <span className="mono currency" style={{ fontSize: 12, fontWeight: 700, color: a.badgeColor }}>
                {a.badgePct}
              </span>
            </div>

            <Sparkline data={a.data} color={a.sparkColor} />

            <div className="flex flex-col items-end ms-auto">
              <span style={{ fontSize: 12, fontWeight: 600, color: "#F5F6FF" }}>{a.name}</span>
              <span className="mono currency" style={{ fontSize: 11, fontWeight: 600, color: a.subColor }}>
                {a.sub}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InvestmentPortfolio;
