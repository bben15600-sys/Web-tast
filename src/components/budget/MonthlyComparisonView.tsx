import { useBudgetData, type BudgetCategory, type BudgetData } from "@/hooks/useBudgetData";
import { BackButton } from "./MoneyMasterMenu";

export function MonthlyComparisonView({
  currentData,
  monthOffset,
  onBack,
}: {
  currentData: BudgetData;
  monthOffset: number;
  onBack: () => void;
}) {
  // Fetch the previous month on top of the current one.
  const prior = useBudgetData({ monthOffset: monthOffset - 1 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between" style={{ padding: "4px 2px" }}>
        <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#FBBF24", letterSpacing: "-0.01em" }}>
          השוואה חודשית
        </h1>
        <BackButton onClick={onBack} />
      </div>

      {prior.isLoading && (
        <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
          <div style={{ padding: "24px", textAlign: "center", color: "#6B7094", fontSize: 13 }}>
            טוען חודש קודם…
          </div>
        </section>
      )}
      {prior.error && (
        <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
          <div style={{ padding: "24px", textAlign: "center", color: "#FB7185", fontSize: 13 }}>
            שגיאה בטעינת חודש קודם: {prior.error}
          </div>
        </section>
      )}
      {prior.data && (
        <ComparisonBody current={currentData} prior={prior.data} />
      )}
    </div>
  );
}

function ComparisonBody({ current, prior }: { current: BudgetData; prior: BudgetData }) {
  const kpis: Array<{ label: string; cur: number; prev: number; color: string; reverse?: boolean }> = [
    { label: "הכנסות", cur: current.totals.income, prev: prior.totals.income, color: "#34D399" },
    { label: "הוצאות", cur: current.totals.expense, prev: prior.totals.expense, color: "#FB7185", reverse: true },
    { label: "מאזן", cur: current.totals.net, prev: prior.totals.net, color: "#A78BFA" },
    { label: "חסכונות והשקעות", cur: current.totals.savings, prev: prior.totals.savings, color: "#60A5FA" },
  ];

  // Category-level comparison keyed by category id.
  const prevById = new Map(prior.categories.map((c) => [c.id, c]));
  const categoryDiffs = current.categories
    .filter((c) => c.spent > 0 || prevById.get(c.id)?.spent)
    .map((c) => {
      const prev = prevById.get(c.id);
      const prevSpent = prev?.spent ?? 0;
      return { c, prevSpent, diff: c.spent - prevSpent };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return (
    <>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span className="label-cap">{current.monthLabel}</span>
          <span className="label-cap" style={{ color: "#6B7094" }}>↩︎ {prior.monthLabel}</span>
        </div>
        <div className="flex flex-col" style={{ gap: 10 }}>
          {kpis.map((k) => (
            <KpiDiffRow key={k.label} {...k} />
          ))}
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F5F6FF", marginBottom: 10 }}>
          שינוי לפי קטגוריה
        </h2>
        {categoryDiffs.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "16px 0" }}>
            אין נתונים להשוואה
          </div>
        ) : (
          categoryDiffs.map(({ c, prevSpent, diff }) => (
            <CategoryDiffRow key={c.id} category={c} prevSpent={prevSpent} diff={diff} />
          ))
        )}
      </section>
    </>
  );
}

function KpiDiffRow({
  label,
  cur,
  prev,
  color,
  reverse,
}: {
  label: string;
  cur: number;
  prev: number;
  color: string;
  reverse?: boolean;
}) {
  const diff = cur - prev;
  const diffPct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : null;
  // For expense "good" = down. For income/savings/balance "good" = up.
  const good = reverse ? diff < 0 : diff > 0;
  const diffColor = diff === 0 ? "#6B7094" : good ? "#34D399" : "#FB7185";

  return (
    <div className="flex items-center justify-between" style={{ gap: 12 }}>
      <span style={{ fontSize: 13, color: "#B4B8D4" }}>{label}</span>
      <div className="flex items-center gap-3" style={{ direction: "ltr" }}>
        <span className="mono currency" style={{ fontSize: 12, color: "#6B7094", minWidth: 90, textAlign: "end" }}>
          ₪{Math.round(Math.abs(prev)).toLocaleString()}
        </span>
        <span style={{ color: "#6B7094" }}>→</span>
        <span className="mono currency" style={{ fontSize: 14, fontWeight: 700, color, minWidth: 100, textAlign: "end" }}>
          ₪{Math.round(Math.abs(cur)).toLocaleString()}
        </span>
        <span
          className="mono"
          style={{
            minWidth: 90,
            textAlign: "end",
            fontSize: 11,
            fontWeight: 600,
            color: diffColor,
          }}
        >
          {diff === 0 ? "ללא שינוי" : `${diff > 0 ? "+" : "−"}₪${Math.round(Math.abs(diff)).toLocaleString()}`}
          {diffPct != null && diff !== 0 && (
            <span style={{ color: "#6B7094", fontWeight: 400 }}>
              {" "}({diffPct > 0 ? "+" : ""}{diffPct.toFixed(0)}%)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function CategoryDiffRow({
  category,
  prevSpent,
  diff,
}: {
  category: BudgetCategory;
  prevSpent: number;
  diff: number;
}) {
  const diffPct = prevSpent !== 0 ? (diff / Math.abs(prevSpent)) * 100 : null;
  const diffColor = diff === 0 ? "#6B7094" : diff > 0 ? "#FB7185" : "#34D399";

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "10px 2px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, color: "#F5F6FF", display: "inline-flex", alignItems: "center", gap: 6 }}>
        {category.emoji && <span style={{ fontSize: 14 }}>{category.emoji}</span>}
        {category.name}
      </span>
      <div className="flex items-center gap-3" style={{ direction: "ltr" }}>
        <span className="mono" style={{ fontSize: 11, color: "#6B7094", minWidth: 70, textAlign: "end" }}>
          ₪{Math.round(prevSpent).toLocaleString()}
        </span>
        <span style={{ color: "#6B7094" }}>→</span>
        <span className="mono currency" style={{ fontSize: 13, fontWeight: 600, color: "#F5F6FF", minWidth: 80, textAlign: "end" }}>
          ₪{Math.round(category.spent).toLocaleString()}
        </span>
        <span
          className="mono"
          style={{ minWidth: 80, textAlign: "end", fontSize: 11, fontWeight: 600, color: diffColor }}
        >
          {diff === 0 ? "—" : `${diff > 0 ? "+" : "−"}₪${Math.round(Math.abs(diff)).toLocaleString()}`}
          {diffPct != null && diff !== 0 && (
            <span style={{ color: "#6B7094", fontWeight: 400 }}>
              {" "}({diffPct > 0 ? "+" : ""}{diffPct.toFixed(0)}%)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
