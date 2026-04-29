type Props = {
  percent: number;
  color: string;
  centerText: string;
  subLabel: string;
  size?: number;
};

const Donut = ({ percent, color, centerText, subLabel, size = 96 }: Props) => {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="mono currency"
            style={{ fontSize: 18, fontWeight: 700, color: "#F5F6FF" }}
          >
            {centerText}
          </span>
        </div>
      </div>
      <span className="label-cap">{subLabel}</span>
    </div>
  );
};

export default Donut;
