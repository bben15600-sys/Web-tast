import Donut from "./Donut";

const ROWS = [
  { label: "תקציב חודשי", value: "₪ 22,500" },
  { label: "הוצאות נוכחיות", value: "₪ 3,200" },
];

const BudgetSmall = ({ style }: { style?: React.CSSProperties }) => {
  return (
    <section className="glass" style={style}>
      <div className="card-header">
        <h2 className="card-title">Budget Tracker</h2>
      </div>

      <div className="flex justify-center items-center gap-4">
        <Donut percent={30} color="#FBBF24" centerText="30%" subLabel="הוצאות" />
        <Donut percent={30} color="#A78BFA" centerText="30%" subLabel="הכנסות" />
      </div>

      <div style={{ marginTop: 14 }} className="flex flex-col">
        {ROWS.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center justify-between"
            style={{
              padding: "6px 0",
              borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontSize: 12, color: "#6B7094" }}>{r.label}</span>
            <span className="mono currency" style={{ fontSize: 12, fontWeight: 600, color: "#F5F6FF" }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BudgetSmall;
