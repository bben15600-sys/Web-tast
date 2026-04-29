export type MMView =
  | "home"
  | "menu"
  | "all-expenses"
  | "all-incomes"
  | "recurring"
  | "budgets"
  | "category-detail"
  | "income-forecast"
  | "yearly-forecast"
  | "monthly-summary"
  | "yearly-summary"
  | "monthly-comparison"
  | "expense-categories"
  | "income-categories"
  | "my-expenses"
  | "my-incomes";

type Handler = (v: MMView) => void;

type Section = {
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  label: string;
  view?: MMView;
  href?: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
};

const SECTIONS: Section[] = [
  {
    title: "פעולות מהירות",
    items: [
      { label: "הוסף הוצאה", icon: "⬇️", color: "#FB7185", bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.28)" },
      { label: "הוסף הכנסה", icon: "⬆️", color: "#34D399", bg: "rgba(52,211,153,0.14)", border: "rgba(52,211,153,0.30)" },
    ],
  },
  {
    title: "ביצוע",
    items: [
      { label: "כל ההוצאות", icon: "⬇️", view: "all-expenses", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
      { label: "כל ההכנסות", icon: "⬆️", view: "all-incomes", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
      { label: "קבועות ותשלומים", icon: "↻", view: "recurring", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
    ],
  },
  {
    title: "תכנון",
    items: [
      { label: "תקציב", icon: "🎯", view: "budgets", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
      { label: "צפי הכנסות", icon: "📈", view: "income-forecast", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
      { label: "מה צפוי לי השנה", icon: "🔭", view: "yearly-forecast", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
    ],
  },
  {
    title: "סיכום",
    items: [
      { label: "סיכום שנתי", icon: "📊", view: "yearly-summary", color: "#FBBF24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.24)" },
      { label: "סיכום חודשי", icon: "📅", view: "monthly-summary", color: "#FBBF24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.24)" },
      { label: "השוואה חודשית", icon: "⇄", view: "monthly-comparison", color: "#FBBF24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.24)" },
    ],
  },
  {
    title: "קטגוריות",
    items: [
      { label: "קטגוריות הוצאות", icon: "🗂️", view: "expense-categories", color: "#FB7185", bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.22)" },
      { label: "קטגוריות הכנסות", icon: "🗂️", view: "income-categories", color: "#34D399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.24)" },
    ],
  },
  {
    title: "התצוגות שלי",
    items: [
      { label: "הוצאות", icon: "⬇️", view: "my-expenses", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
      { label: "הכנסות", icon: "⬆️", view: "my-incomes", color: "#B4B8D4", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
    ],
  },
  {
    title: "תמיכה",
    items: [
      { label: "מדריך", icon: "📘", href: "https://github.com/bben15600-sys/Web-tast#readme", color: "#60A5FA", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)" },
      { label: "דיווח על תקלה", icon: "🔧", href: "https://github.com/bben15600-sys/Web-tast/issues/new", color: "#60A5FA", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)" },
      { label: "הצעות לשיפור", icon: "💫", href: "https://github.com/bben15600-sys/Web-tast/issues/new", color: "#60A5FA", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.24)" },
    ],
  },
];

export function MoneyMasterMenu({
  onPick,
  onQuickAddExpense,
  onQuickAddIncome,
  onBack,
}: {
  onPick: Handler;
  onQuickAddExpense: () => void;
  onQuickAddIncome: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between" style={{ padding: "4px 2px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#F5F6FF", letterSpacing: "-0.02em" }}>
          תפריט
        </h1>
        <BackButton onClick={onBack} />
      </div>

      <button
        type="button"
        onClick={() => onPick("home")}
        style={pillStyle("#B4B8D4", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.08)")}
      >
        <span style={{ fontSize: 14 }}>🏠</span>
        <span>מסך ראשי</span>
      </button>

      {SECTIONS.map((s, i) => (
        <section
          key={s.title}
          className="glass"
          style={{
            padding: "14px 16px",
            ["--i" as string]: i,
          } as React.CSSProperties}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#F5F6FF",
              letterSpacing: "-0.01em",
              textAlign: "end",
              marginBottom: 12,
            }}
          >
            {s.title}
          </h2>
          <div className="flex flex-col gap-2" style={{ alignItems: "flex-end" }}>
            {s.items.map((item) => (
              <MenuButton
                key={item.label}
                item={item}
                onClick={() => {
                  if (item.href) {
                    window.open(item.href, "_blank", "noopener,noreferrer");
                    return;
                  }
                  if (item.view) return onPick(item.view);
                  if (item.label === "הוסף הוצאה") return onQuickAddExpense();
                  if (item.label === "הוסף הכנסה") return onQuickAddIncome();
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MenuButton({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={pillStyle(item.color, item.bg, item.border)}>
      <span style={{ fontSize: 14 }}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

function pillStyle(color: string, bg: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 10,
    background: bg,
    border: `1px solid ${border}`,
    color,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    maxWidth: "100%",
    textAlign: "end",
    fontFamily: "inherit",
  };
}

export function BackButton({ onClick, label = "חזרה" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#B4B8D4",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
      {label}
    </button>
  );
}
