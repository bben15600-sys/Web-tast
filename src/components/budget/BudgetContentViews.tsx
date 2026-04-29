import type { BudgetCategory, BudgetData, BudgetTransaction } from "@/hooks/useBudgetData";
import { BackButton } from "./MoneyMasterMenu";

// ── Shared shell ─────────────────────────────────────────────────────────────
function Shell({
  title,
  accent,
  onBack,
  subtitle,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  accent: string;
  onBack: () => void;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between" style={{ padding: "4px 2px" }}>
        <div className="flex flex-col">
          <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          {subtitle && <span className="label-cap" style={{ color: "#6B7094" }}>{subtitle}</span>}
        </div>
        <div className="flex items-center gap-2">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                background: `${accent}22`,
                border: `1px solid ${accent}48`,
                color: accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + {addLabel ?? "הוסף"}
            </button>
          )}
          <BackButton onClick={onBack} />
        </div>
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        background: "rgba(10,12,28,0.55)",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flex: 1,
        minWidth: 120,
      }}
    >
      <span className="label-cap">{label}</span>
      <span className="mono currency" style={{ fontSize: 22, color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

function BreakdownRow({
  emoji,
  label,
  amount,
  pct,
  count,
  color,
  max,
}: {
  emoji?: string | null;
  label: string;
  amount: number;
  pct: number;
  count?: number;
  color: string;
  max: number;
}) {
  const width = max > 0 ? Math.min((amount / max) * 100, 100) : 0;
  return (
    <div className="flex flex-col gap-1.5" style={{ padding: "8px 2px" }}>
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <span
          style={{
            fontSize: 13,
            color: "#F5F6FF",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {emoji && <span style={{ fontSize: 14 }}>{emoji}</span>}
          {label}
          {count != null && <span style={{ fontSize: 10, color: "#6B7094" }}>· {count}</span>}
        </span>
        <span className="mono" style={{ fontSize: 12, color: "#B4B8D4", whiteSpace: "nowrap" }}>
          <span className="currency" style={{ color: "#F5F6FF", fontWeight: 700 }}>
            ₪{Math.round(amount).toLocaleString()}
          </span>
          <span style={{ color: "#6B7094" }}> · {Math.round(pct)}%</span>
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

// ── Monthly Summary ──────────────────────────────────────────────────────────
export function MonthlySummaryView({ data, onBack }: { data: BudgetData; onBack: () => void }) {
  const { totals, transactions, categories, monthLabel } = data;
  const expenses = transactions.filter((t) => t.type === "expense");
  const incomes = transactions.filter((t) => t.type === "income");

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const byCategory = new Map<string, { cat?: BudgetCategory; name: string; emoji?: string; total: number; count: number; color: string }>();
  for (const t of expenses) {
    const key = t.categoryId ?? "__uncat__";
    const cat = t.categoryId ? categoryById.get(t.categoryId) : undefined;
    const e = byCategory.get(key) ?? {
      cat,
      name: cat?.name ?? t.categoryName ?? "לא שובץ",
      emoji: cat?.emoji ?? t.categoryEmoji ?? "🚫",
      total: 0,
      count: 0,
      color: cat?.color ?? "#FB7185",
    };
    e.total += t.amount;
    e.count += 1;
    byCategory.set(key, e);
  }
  const expenseBreakdown = Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
  const maxExpense = expenseBreakdown[0]?.total ?? 0;

  const byIncomeType = new Map<string, { name: string; total: number; count: number }>();
  for (const t of incomes) {
    const key = t.categoryName ?? "הכנסה";
    const e = byIncomeType.get(key) ?? { name: key, total: 0, count: 0 };
    e.total += t.amount;
    e.count += 1;
    byIncomeType.set(key, e);
  }
  const incomeBreakdown = Array.from(byIncomeType.values()).sort((a, b) => b.total - a.total);
  const maxIncome = incomeBreakdown[0]?.total ?? 0;

  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const overbudget = categories.filter((c) => c.budget > 0 && c.percent > 100).length;

  return (
    <Shell title="סיכום חודשי" accent="#FBBF24" onBack={onBack} subtitle={monthLabel}>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <Kpi label="הכנסות" value={`₪${Math.round(totals.income).toLocaleString()}`} color="#34D399" />
          <Kpi label="הוצאות" value={`₪${Math.round(totals.expense).toLocaleString()}`} color="#FB7185" />
          <Kpi
            label="מאזן"
            value={`${totals.net >= 0 ? "+" : "−"}₪${Math.round(Math.abs(totals.net)).toLocaleString()}`}
            color={totals.net >= 0 ? "#34D399" : "#FB7185"}
          />
        </div>
        <div className="flex gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
          <Kpi label="חסכונות והשקעות" value={`₪${Math.round(totals.savings).toLocaleString()}`} color="#60A5FA" />
          <Kpi label="מס' טרנזקציות" value={String(transactions.length)} color="#A78BFA" />
          <Kpi label="קטגוריות בחריגה" value={String(overbudget)} color={overbudget > 0 ? "#FB7185" : "#34D399"} />
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#FB7185", marginBottom: 8 }}>
          הוצאות לפי קטגוריה
        </h2>
        {expenseBreakdown.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "16px 0" }}>
            אין הוצאות החודש
          </div>
        ) : (
          expenseBreakdown.map((b) => (
            <BreakdownRow
              key={b.name}
              emoji={b.emoji}
              label={b.name}
              amount={b.total}
              pct={(b.total / totals.expense) * 100}
              count={b.count}
              color={b.color}
              max={maxExpense}
            />
          ))
        )}
      </section>

      <section className="glass" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#34D399", marginBottom: 8 }}>
          הכנסות לפי סוג
        </h2>
        {incomeBreakdown.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "16px 0" }}>
            אין הכנסות החודש
          </div>
        ) : (
          incomeBreakdown.map((b) => (
            <BreakdownRow
              key={b.name}
              label={b.name}
              amount={b.total}
              pct={(b.total / totals.income) * 100}
              count={b.count}
              color="#34D399"
              max={maxIncome}
            />
          ))
        )}
      </section>

      {topExpenses.length > 0 && (
        <section className="glass" style={{ ["--i" as string]: 4 } as React.CSSProperties}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F5F6FF", marginBottom: 8 }}>
            הוצאות הגדולות ביותר
          </h2>
          <div className="flex flex-col">
            {topExpenses.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center gap-3"
                style={{
                  padding: "10px 2px",
                  borderBottom: i === topExpenses.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <span style={{ flex: 1, fontSize: 13, color: "#F5F6FF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.name}
                </span>
                <span style={{ fontSize: 11, color: "#B4B8D4", whiteSpace: "nowrap" }}>
                  {t.categoryEmoji ? `${t.categoryEmoji} ` : ""}{t.categoryName ?? "לא שובץ"}
                </span>
                <span className="mono currency" style={{ fontSize: 13, fontWeight: 700, color: "#F5F6FF", minWidth: 80, textAlign: "end" }}>
                  ₪{Math.round(t.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}

// ── Yearly Summary (extrapolated from current month) ─────────────────────────
export function YearlySummaryView({ data, onBack }: { data: BudgetData; onBack: () => void }) {
  const { totals, categories } = data;
  const now = new Date();
  const annualIncome = totals.income * 12;
  const annualExpense = totals.expense * 12;
  const annualSavings = totals.savings * 12;
  const annualNet = annualIncome - annualExpense;
  const annualBudget = categories.reduce((s, c) => s + c.budget, 0) * 12;

  return (
    <Shell title="סיכום שנתי" accent="#FBBF24" onBack={onBack} subtitle={`${now.getFullYear()} · על בסיס החודש הנוכחי × 12`}>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div
          style={{
            fontSize: 11,
            color: "#6B7094",
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.16)",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          ⚠️ המספרים נגזרים מהחודש הנוכחי × 12. לחישוב אמיתי לפי נתוני 12 חודשים בפועל נצטרך להרחיב את ה-hook לקרוא מה-AnnualSummary_Database.
        </div>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <Kpi label="הכנסות שנתיות" value={`₪${Math.round(annualIncome).toLocaleString()}`} color="#34D399" />
          <Kpi label="הוצאות שנתיות" value={`₪${Math.round(annualExpense).toLocaleString()}`} color="#FB7185" />
          <Kpi
            label="מאזן שנתי"
            value={`${annualNet >= 0 ? "+" : "−"}₪${Math.round(Math.abs(annualNet)).toLocaleString()}`}
            color={annualNet >= 0 ? "#34D399" : "#FB7185"}
          />
        </div>
        <div className="flex gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
          <Kpi label="חסכונות + השקעות שנתי" value={`₪${Math.round(annualSavings).toLocaleString()}`} color="#60A5FA" />
          <Kpi label="סה״כ תקציב שנתי" value={`₪${Math.round(annualBudget).toLocaleString()}`} color="#A78BFA" />
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F5F6FF", marginBottom: 8 }}>
          הוצאה צפויה לפי קטגוריה
        </h2>
        {categories
          .filter((c) => c.budget > 0)
          .sort((a, b) => b.budget - a.budget)
          .map((c) => (
            <BreakdownRow
              key={c.id}
              emoji={c.emoji}
              label={c.name}
              amount={c.budget * 12}
              pct={annualBudget > 0 ? ((c.budget * 12) / annualBudget) * 100 : 0}
              color={c.color}
              max={categories.reduce((m, cc) => Math.max(m, cc.budget * 12), 0)}
            />
          ))}
      </section>
    </Shell>
  );
}

// ── Expense Categories (grouped by נושא הקטגוריה) ────────────────────────────
export function ExpenseCategoriesView({
  categories,
  onBack,
  onOpenCategory,
  onEditBudget,
  onAdd,
  onEditCategory,
}: {
  categories: BudgetCategory[];
  onBack: () => void;
  onOpenCategory: (c: BudgetCategory) => void;
  onEditBudget: (c: BudgetCategory) => void;
  onAdd: () => void;
  onEditCategory: (c: BudgetCategory) => void;
}) {
  const byGroup = new Map<string, BudgetCategory[]>();
  for (const c of categories) {
    const g = c.group ?? "ללא קבוצה";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(c);
  }
  const groups = Array.from(byGroup.entries()).sort(
    (a, b) => (a[1][0]?.sort ?? 999) - (b[1][0]?.sort ?? 999),
  );

  return (
    <Shell
      title="קטגוריות הוצאות"
      accent="#FB7185"
      onBack={onBack}
      subtitle={`${categories.length} קטגוריות`}
      onAdd={onAdd}
      addLabel="קטגוריה"
    >
      {groups.map(([groupName, items], gi) => (
        <section
          key={groupName}
          className="glass"
          style={{ ["--i" as string]: gi + 1 } as React.CSSProperties}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#FB7185",
              marginBottom: 10,
              letterSpacing: "0.02em",
            }}
          >
            {groupName}
            <span className="mono" style={{ fontSize: 10, color: "#6B7094", fontWeight: 500, marginInlineStart: 6 }}>
              · {items.length}
            </span>
          </h2>
          <div className="flex flex-col" style={{ gap: 6 }}>
            {items
              .sort((a, b) => a.sort - b.sort)
              .map((c) => (
                <div key={c.id} style={{ position: "relative", borderRadius: 8 }}>
                  <button
                    type="button"
                    onClick={() => onOpenCategory(c)}
                    className="cat-mini"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 6px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "start",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{c.emoji || "📊"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#F5F6FF", flex: 1 }}>{c.name}</span>
                    <span className="mono currency" style={{ fontSize: 12, color: "#B4B8D4" }}>
                      ₪{Math.round(c.budget).toLocaleString()}
                    </span>
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      insetInlineStart: 6,
                      top: 8,
                      display: "flex",
                      gap: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditCategory(c); }}
                      aria-label="ערוך קטגוריה"
                      title="ערוך קטגוריה (שם / סוג / קבוצה)"
                      style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: "rgba(251,113,133,0.10)",
                        border: "1px solid rgba(251,113,133,0.26)",
                        color: "#FB7185",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditBudget(c); }}
                      aria-label="ערוך תקציב"
                      title="ערוך תקציב"
                      style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: "rgba(167,139,250,0.12)",
                        border: "1px solid rgba(167,139,250,0.28)",
                        color: "#A78BFA",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
      <style>{`.cat-mini:hover { background: rgba(255,255,255,0.04) !important; }`}</style>
    </Shell>
  );
}

// ── Income Categories (aggregated from current-month income transactions) ────
export function IncomeCategoriesView({
  incomes,
  onBack,
}: {
  incomes: BudgetTransaction[];
  onBack: () => void;
}) {
  const total = incomes.reduce((s, t) => s + t.amount, 0);
  const byType = new Map<string, { name: string; total: number; count: number; sampleDate?: Date }>();
  for (const t of incomes) {
    const key = t.categoryName ?? "ללא סוג";
    const e = byType.get(key) ?? { name: key, total: 0, count: 0 };
    e.total += t.amount;
    e.count += 1;
    if (!e.sampleDate || t.date > e.sampleDate) e.sampleDate = t.date;
    byType.set(key, e);
  }
  const rows = Array.from(byType.values()).sort((a, b) => b.total - a.total);
  const max = rows[0]?.total ?? 0;

  return (
    <Shell title="קטגוריות הכנסות" accent="#34D399" onBack={onBack} subtitle={`${rows.length} סוגים · ${incomes.length} רשומות`}>
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        {rows.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "24px 0" }}>
            אין הכנסות החודש
          </div>
        ) : (
          rows.map((r) => (
            <BreakdownRow
              key={r.name}
              label={r.name}
              amount={r.total}
              pct={total > 0 ? (r.total / total) * 100 : 0}
              count={r.count}
              color="#34D399"
              max={max}
            />
          ))
        )}
        <div
          className="flex items-center justify-end gap-3"
          style={{
            padding: "12px 2px 4px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            marginTop: 8,
          }}
        >
          <span className="label-cap" style={{ color: "#34D399" }}>SUM</span>
          <span className="mono currency" style={{ fontSize: 16, fontWeight: 700, color: "#34D399" }}>
            ₪{Math.round(total).toLocaleString()}
          </span>
        </div>
      </section>
    </Shell>
  );
}

// ── Income Forecast (projection from recurring incomes) ──────────────────────
export function IncomeForecastView({
  incomes,
  onBack,
}: {
  incomes: BudgetTransaction[];
  onBack: () => void;
}) {
  const recurring = incomes.filter((t) => t.frequency === "קבועה");
  const oneOff = incomes.filter((t) => t.frequency && t.frequency !== "קבועה");
  const undef = incomes.filter((t) => !t.frequency);

  const monthlyRecurring = recurring.reduce((s, t) => s + t.amount, 0);
  const annualRecurring = monthlyRecurring * 12;
  const max = recurring.reduce((m, t) => Math.max(m, t.amount), 0);

  return (
    <Shell
      title="צפי הכנסות"
      accent="#34D399"
      onBack={onBack}
      subtitle="מבוסס על הכנסות קבועות של החודש הנוכחי"
    >
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div
          style={{
            fontSize: 11,
            color: "#6B7094",
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.16)",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          ℹ️ התחזית כוללת רק רשומות שבהן `תדירות = קבועה`. חד־פעמיות ותשלומים לא נספרים.
        </div>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <Kpi label="חודשי צפוי" value={`₪${Math.round(monthlyRecurring).toLocaleString()}`} color="#34D399" />
          <Kpi label="שנתי צפוי" value={`₪${Math.round(annualRecurring).toLocaleString()}`} color="#34D399" />
          <Kpi label="מקורות קבועים" value={String(recurring.length)} color="#A78BFA" />
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#34D399", marginBottom: 8 }}>
          הכנסות קבועות
        </h2>
        {recurring.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "16px 0" }}>
            אין הכנסות קבועות החודש
          </div>
        ) : (
          recurring
            .sort((a, b) => b.amount - a.amount)
            .map((t) => (
              <BreakdownRow
                key={t.id}
                label={t.name}
                amount={t.amount}
                pct={monthlyRecurring > 0 ? (t.amount / monthlyRecurring) * 100 : 0}
                color="#34D399"
                max={max}
              />
            ))
        )}
      </section>

      {(oneOff.length > 0 || undef.length > 0) && (
        <section className="glass" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#B4B8D4", marginBottom: 8 }}>
            לא נלקחים בחשבון
          </h2>
          <div style={{ fontSize: 11.5, color: "#6B7094", lineHeight: 1.6 }}>
            {oneOff.length > 0 && <div>חד־פעמיות / תשלומים: {oneOff.length}</div>}
            {undef.length > 0 && <div>ללא שדה תדירות: {undef.length}</div>}
          </div>
        </section>
      )}
    </Shell>
  );
}

// ── Yearly Forecast (full annual view) ───────────────────────────────────────
export function YearlyForecastView({ data, onBack }: { data: BudgetData; onBack: () => void }) {
  const { totals, categories, transactions } = data;
  const recurringIncome = transactions
    .filter((t) => t.type === "income" && t.frequency === "קבועה")
    .reduce((s, t) => s + t.amount, 0);

  const annualIncomeFromRecurring = recurringIncome * 12;
  const annualIncomeFromThisMonth = totals.income * 12;
  const annualExpenseFromBudget = categories.reduce((s, c) => s + c.budget, 0) * 12;
  const annualExpenseFromThisMonth = totals.expense * 12;

  const optimistic = annualIncomeFromRecurring - annualExpenseFromBudget;
  const realistic = annualIncomeFromThisMonth - annualExpenseFromThisMonth;

  const annualSavings = categories
    .filter((c) => c.type === "חסכון" || c.type === "השקעה" || c.type === "השקעות")
    .reduce((s, c) => s + c.budget, 0) * 12;

  const now = new Date();
  const monthsLeft = 12 - now.getMonth();
  const projectedRestOfYear = totals.net * monthsLeft;

  return (
    <Shell
      title="מה צפוי לי השנה"
      accent="#60A5FA"
      onBack={onBack}
      subtitle={`${now.getFullYear()} · שני תרחישים: לפי תקציב vs לפי הביצוע החודשי`}
    >
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#60A5FA", marginBottom: 10 }}>
          תרחיש א׳ — לפי התקציב
        </h2>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <Kpi label="הכנסה שנתית (קבועות)" value={`₪${Math.round(annualIncomeFromRecurring).toLocaleString()}`} color="#34D399" />
          <Kpi label="תקציב הוצאות שנתי" value={`₪${Math.round(annualExpenseFromBudget).toLocaleString()}`} color="#FB7185" />
          <Kpi
            label="עודף/גרעון צפוי"
            value={`${optimistic >= 0 ? "+" : "−"}₪${Math.round(Math.abs(optimistic)).toLocaleString()}`}
            color={optimistic >= 0 ? "#34D399" : "#FB7185"}
          />
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#FBBF24", marginBottom: 10 }}>
          תרחיש ב׳ — לפי הביצוע החודשי × 12
        </h2>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <Kpi label="הכנסה שנתית" value={`₪${Math.round(annualIncomeFromThisMonth).toLocaleString()}`} color="#34D399" />
          <Kpi label="הוצאה שנתית" value={`₪${Math.round(annualExpenseFromThisMonth).toLocaleString()}`} color="#FB7185" />
          <Kpi
            label="עודף/גרעון צפוי"
            value={`${realistic >= 0 ? "+" : "−"}₪${Math.round(Math.abs(realistic)).toLocaleString()}`}
            color={realistic >= 0 ? "#34D399" : "#FB7185"}
          />
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#A78BFA", marginBottom: 10 }}>
          חסכונות והשקעות
        </h2>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <Kpi label="תקציב חיסכון שנתי" value={`₪${Math.round(annualSavings).toLocaleString()}`} color="#A78BFA" />
          <Kpi
            label="צפי לסוף השנה (מבוסס מאזן חודשי × נותרו חודשים)"
            value={`${projectedRestOfYear >= 0 ? "+" : "−"}₪${Math.round(Math.abs(projectedRestOfYear)).toLocaleString()}`}
            color={projectedRestOfYear >= 0 ? "#34D399" : "#FB7185"}
          />
          <Kpi label="חודשים שנותרו" value={String(monthsLeft)} color="#B4B8D4" />
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 4 } as React.CSSProperties}>
        <div
          style={{
            fontSize: 11,
            color: "#6B7094",
            padding: "8px 12px",
            lineHeight: 1.6,
          }}
        >
          ⚠️ התחזיות מבוססות על נתוני החודש הנוכחי בלבד. לתחזית מבוססת היסטוריה
          אמיתית צריך לשלוף את שנים עשר החודשים מ-AnnualSummary_Database.
        </div>
      </section>
    </Shell>
  );
}

