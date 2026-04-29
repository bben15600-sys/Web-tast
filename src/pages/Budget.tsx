import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "@/components/dashboard/AppShell";
import {
  useBudgetData,
  type BudgetCategory,
  type BudgetData,
  type BudgetTransaction,
} from "@/hooks/useBudgetData";
import { TransactionFormModal } from "@/components/budget/TransactionFormModal";
import { CategoryBudgetModal } from "@/components/budget/CategoryBudgetModal";
import { CategoryManageModal } from "@/components/budget/CategoryManageModal";
import { RecurringSuggestionsCard } from "@/components/budget/RecurringSuggestionsCard";
import { SavingsCard } from "@/components/budget/SavingsCard";
import { MoneyMasterMenu, type MMView } from "@/components/budget/MoneyMasterMenu";
import {
  BudgetCategoriesView,
  CategoryDetailView,
  TransactionsTableView,
} from "@/components/budget/BudgetDetailViews";
import {
  ExpenseCategoriesView,
  IncomeCategoriesView,
  IncomeForecastView,
  MonthlySummaryView,
  YearlyForecastView,
  YearlySummaryView,
} from "@/components/budget/BudgetContentViews";
import { MonthlyComparisonView } from "@/components/budget/MonthlyComparisonView";
import { ReceiptCaptureButton } from "@/components/budget/ReceiptCaptureButton";
import { VoiceExpenseButton } from "@/components/budget/VoiceExpenseButton";

type ReceiptPrefill = {
  name?: string;
  amount?: number;
  date?: string;
  paymentMethod?: string | null;
  categoryHint?: string | null;
  notes?: string | null;
};
type ModalState =
  | { mode: "create"; kind: "expense" | "income"; presetCategoryId?: string; prefill?: ReceiptPrefill }
  | { mode: "edit"; kind: "expense" | "income"; tx: BudgetTransaction }
  | { mode: "edit-budget"; category: BudgetCategory }
  | { mode: "category-create" }
  | { mode: "category-edit"; category: BudgetCategory }
  | null;

const Budget = () => {
  const [monthOffset, setMonthOffset] = useState(0);
  const { data, reference, isLoading, error, isConfigMissing, missingKeys } = useBudgetData({ monthOffset });
  const [modal, setModal] = useState<ModalState>(null);
  const [view, setView] = useState<MMView>("home");
  const [detailCategoryId, setDetailCategoryId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const quick = searchParams.get("quick");
    if (quick === "expense" || quick === "income") {
      setModal({ mode: "create", kind: quick });
      searchParams.delete("quick");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openCategoryDetail = (c: BudgetCategory) => {
    setDetailCategoryId(c.id);
    setView("category-detail");
  };

  return (
    <AppShell>
      <h1 className="sr-only">Money Master</h1>

      <div className="flex flex-col gap-5">
        {isConfigMissing ? (
          <ConfigMissing missing={missingKeys} />
        ) : error ? (
          <ErrorState message={error} />
        ) : isLoading || !data ? (
          <LoadingState />
        ) : (
          <Router
            view={view}
            setView={setView}
            data={data}
            onOpenModal={setModal}
            detailCategoryId={detailCategoryId}
            onOpenCategoryDetail={openCategoryDetail}
            monthOffset={monthOffset}
            setMonthOffset={setMonthOffset}
            reference={reference}
          />
        )}
      </div>

      {modal && data && modal.mode === "edit-budget" && (
        <CategoryBudgetModal
          category={modal.category}
          monthDate={reference}
          onClose={() => setModal(null)}
        />
      )}
      {modal && data && (modal.mode === "category-create" || modal.mode === "category-edit") && (
        <CategoryManageModal
          mode={modal.mode === "category-create" ? "create" : "edit"}
          initial={"category" in modal ? modal.category : undefined}
          onClose={() => setModal(null)}
        />
      )}
      {modal && data && (modal.mode === "create" || modal.mode === "edit") && (
        <TransactionFormModal
          mode={modal.mode}
          kind={modal.kind}
          initial={"tx" in modal ? modal.tx : undefined}
          prefill={modal.mode === "create" ? modal.prefill : undefined}
          presetCategoryId={"presetCategoryId" in modal ? modal.presetCategoryId : undefined}
          categories={data.categories}
          pastTransactions={data.transactions}
          onClose={() => setModal(null)}
        />
      )}
    </AppShell>
  );
};

function Router({
  view,
  setView,
  data,
  onOpenModal,
  detailCategoryId,
  onOpenCategoryDetail,
  monthOffset,
  setMonthOffset,
  reference,
}: {
  view: MMView;
  setView: (v: MMView) => void;
  data: BudgetData;
  onOpenModal: OpenModal;
  detailCategoryId: string | null;
  onOpenCategoryDetail: (c: BudgetCategory) => void;
  monthOffset: number;
  setMonthOffset: (n: number) => void;
  reference: Date;
}) {
  const backHome = () => setView("home");
  const expenseTxs = data.transactions.filter((t) => t.type === "expense");
  const incomeTxs = data.transactions.filter((t) => t.type === "income");
  const recurringTxs = data.transactions.filter(
    (t) => t.frequency && t.frequency !== "חד פעמית",
  );

  switch (view) {
    case "menu":
      return (
        <MoneyMasterMenu
          onPick={setView}
          onQuickAddExpense={() => onOpenModal({ mode: "create", kind: "expense" })}
          onQuickAddIncome={() => onOpenModal({ mode: "create", kind: "income" })}
          onBack={backHome}
        />
      );
    case "all-expenses":
    case "my-expenses":
      return (
        <TransactionsTableView
          title="כל ההוצאות"
          accent="#FB7185"
          txs={expenseTxs}
          onBack={backHome}
          onRowClick={(tx) => onOpenModal({ mode: "edit", kind: "expense", tx })}
          onAdd={() => onOpenModal({ mode: "create", kind: "expense" })}
          addLabel="הוצאה"
          emptyText="לא נמצאו הוצאות החודש"
        />
      );
    case "all-incomes":
    case "my-incomes":
      return (
        <TransactionsTableView
          title="כל ההכנסות"
          accent="#34D399"
          txs={incomeTxs}
          onBack={backHome}
          onRowClick={(tx) => onOpenModal({ mode: "edit", kind: "income", tx })}
          onAdd={() => onOpenModal({ mode: "create", kind: "income" })}
          addLabel="הכנסה"
          emptyText="לא נמצאו הכנסות החודש"
        />
      );
    case "recurring":
      return (
        <TransactionsTableView
          title="קבועות ותשלומים"
          accent="#A78BFA"
          txs={recurringTxs}
          onBack={backHome}
          onRowClick={(tx) => onOpenModal({ mode: "edit", kind: tx.type, tx })}
          emptyText="לא נמצאו הוצאות קבועות/תשלומים החודש"
        />
      );
    case "budgets":
      return (
        <BudgetCategoriesView
          categories={data.categories}
          onBack={backHome}
          onOpenCategory={onOpenCategoryDetail}
          onEditBudget={(c) => onOpenModal({ mode: "edit-budget", category: c })}
        />
      );
    case "category-detail": {
      const cat = data.categories.find((c) => c.id === detailCategoryId);
      if (!cat)
        return (
          <MoneyMaster
            data={data}
            onOpenModal={onOpenModal}
            onOpenMenu={() => setView("menu")}
            onOpenCategory={onOpenCategoryDetail}
            monthOffset={monthOffset}
            setMonthOffset={setMonthOffset}
            reference={reference}
          />
        );
      const catExpenses = data.transactions.filter(
        (t) => t.type === "expense" && t.categoryId === cat.id,
      );
      return (
        <CategoryDetailView
          category={cat}
          expenses={catExpenses}
          onBack={() => setView("budgets")}
          onEditBudget={() => onOpenModal({ mode: "edit-budget", category: cat })}
          onAddExpense={() => onOpenModal({ mode: "create", kind: "expense", presetCategoryId: cat.id })}
          onRowClick={(tx) => onOpenModal({ mode: "edit", kind: "expense", tx })}
        />
      );
    }
    case "income-forecast":
      return (
        <IncomeForecastView
          incomes={data.transactions.filter((t) => t.type === "income")}
          onBack={backHome}
        />
      );
    case "yearly-forecast":
      return <YearlyForecastView data={data} onBack={backHome} />;
    case "monthly-summary":
      return <MonthlySummaryView data={data} onBack={backHome} />;
    case "monthly-comparison":
      return <MonthlyComparisonView currentData={data} monthOffset={monthOffset} onBack={backHome} />;
    case "yearly-summary":
      return <YearlySummaryView data={data} onBack={backHome} />;
    case "expense-categories":
      return (
        <ExpenseCategoriesView
          categories={data.categories}
          onBack={backHome}
          onOpenCategory={onOpenCategoryDetail}
          onEditBudget={(c) => onOpenModal({ mode: "edit-budget", category: c })}
          onAdd={() => onOpenModal({ mode: "category-create" })}
          onEditCategory={(c) => onOpenModal({ mode: "category-edit", category: c })}
        />
      );
    case "income-categories":
      return (
        <IncomeCategoriesView
          incomes={data.transactions.filter((t) => t.type === "income")}
          onBack={backHome}
        />
      );
    case "home":
    default:
      return (
        <MoneyMaster
          data={data}
          onOpenModal={onOpenModal}
          onOpenMenu={() => setView("menu")}
          onOpenCategory={onOpenCategoryDetail}
          monthOffset={monthOffset}
          setMonthOffset={setMonthOffset}
          reference={reference}
        />
      );
  }
}

type OpenModal = (m: ModalState) => void;

function MoneyMaster({
  data,
  onOpenModal,
  onOpenMenu,
  onOpenCategory,
  monthOffset,
  setMonthOffset,
  reference,
}: {
  data: BudgetData;
  onOpenModal: OpenModal;
  onOpenMenu: () => void;
  onOpenCategory: (c: BudgetCategory) => void;
  monthOffset: number;
  setMonthOffset: (n: number) => void;
  reference: Date;
}) {
  const { transactions, categories, totals, monthLabel } = data;
  const incomeTxs = transactions.filter((t) => t.type === "income");
  const expenseTxs = transactions.filter((t) => t.type === "expense");
  const budgetedCategories = categories
    .filter((c) => c.budget > 0 || c.spent > 0)
    .sort((a, b) => a.sort - b.sort);

  return (
    <>
      <PageHeader
        onOpenModal={onOpenModal}
        onOpenMenu={onOpenMenu}
        monthOffset={monthOffset}
        setMonthOffset={setMonthOffset}
        monthLabel={monthLabel}
      />
      <SummarySection totals={totals} monthLabel={monthLabel} />
      <SavingsCard data={data} />
      <RecurringSuggestionsCard
        monthOffset={monthOffset}
        currentTransactions={transactions}
        reference={reference}
        categories={categories}
      />
      <BudgetSection
        categories={budgetedCategories}
        monthLabel={monthLabel}
        onOpenCategory={onOpenCategory}
        onEditBudget={(c) => onOpenModal({ mode: "edit-budget", category: c })}
      />
      <IncomeSection
        txs={incomeTxs}
        total={totals.income}
        monthLabel={monthLabel}
        onOpenModal={onOpenModal}
      />
      <ExpensesSection
        txs={expenseTxs}
        total={totals.expense}
        monthLabel={monthLabel}
        onOpenModal={onOpenModal}
      />
    </>
  );
}

function PageHeader({
  onOpenModal,
  onOpenMenu,
  monthOffset,
  setMonthOffset,
  monthLabel,
}: {
  onOpenModal: OpenModal;
  onOpenMenu: () => void;
  monthOffset: number;
  setMonthOffset: (n: number) => void;
  monthLabel: string;
}) {
  return (
    <header className="flex flex-col gap-3" style={{ padding: "4px 4px 2px" }}>
      <div className="flex items-center justify-between" style={{ direction: "ltr" }}>
        <h1
          className="mono"
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: "#F5F6FF",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Money Master
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="תפריט"
            onClick={onOpenMenu}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#F5F6FF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div
        className="flex items-center justify-center gap-3"
        style={{
          padding: "4px 8px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          width: "fit-content",
        }}
      >
        <button
          type="button"
          onClick={() => setMonthOffset(monthOffset - 1)}
          aria-label="חודש קודם"
          style={navBtnStyle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setMonthOffset(0)}
          disabled={monthOffset === 0}
          aria-label="חזור לחודש הנוכחי"
          style={{
            ...navBtnStyle,
            width: "auto",
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: monthOffset === 0 ? "#6B7094" : "#F5F6FF",
            minWidth: 120,
          }}
        >
          {monthLabel}
        </button>
        <button
          type="button"
          onClick={() => setMonthOffset(monthOffset + 1)}
          aria-label="חודש הבא"
          style={navBtnStyle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        <ActionPill
          label="הוסף הכנסה"
          bg="rgba(52,211,153,0.14)"
          border="rgba(52,211,153,0.30)"
          color="#34D399"
          onClick={() => onOpenModal({ mode: "create", kind: "income" })}
          direction="up"
        />
        <ActionPill
          label="הוסף הוצאה"
          bg="rgba(251,113,133,0.12)"
          border="rgba(251,113,133,0.28)"
          color="#FB7185"
          onClick={() => onOpenModal({ mode: "create", kind: "expense" })}
          direction="down"
        />
        <ReceiptCaptureButton
          onExtracted={(prefill) =>
            onOpenModal({ mode: "create", kind: "expense", prefill })
          }
        />
        <VoiceExpenseButton
          onExtracted={(prefill) =>
            onOpenModal({ mode: "create", kind: "expense", prefill })
          }
        />
      </div>
    </header>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "transparent",
  border: "none",
  color: "#B4B8D4",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
};

function ActionPill({
  label,
  bg,
  border,
  color,
  onClick,
  direction,
}: {
  label: string;
  bg: string;
  border: string;
  color: string;
  onClick: () => void;
  direction: "up" | "down";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 10,
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {direction === "up" ? (
          <>
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </>
        ) : (
          <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </>
        )}
      </svg>
      <span>{label}</span>
    </button>
  );
}

// ── Summary ──────────────────────────────────────────────────────────────────
function SummarySection({
  totals,
  monthLabel,
}: {
  totals: BudgetData["totals"];
  monthLabel: string;
}) {
  return (
    <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
      <SectionTitle text="סיכום - חודש נוכחי" color="#FBBF24" />
      <div className="flex flex-col gap-3">
        <SummaryRow label={`הכנסות - ${monthLabel}`} amount={totals.income} color="#34D399" />
        <SummaryRow label={`הוצאות - ${monthLabel}`} amount={totals.expense} color="#FB7185" />
        <SummaryRow
          label="חסכונות והשקעות (מתוך ההוצאות)"
          amount={totals.savings}
          color="#60A5FA"
          subtle
        />
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  amount,
  color,
  subtle,
}: {
  label: string;
  amount: number;
  color: string;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 13, color: subtle ? "#6B7094" : "#B4B8D4" }}>{label}</span>
      <span className="mono currency" style={{ fontSize: 18, fontWeight: 700, color }}>
        ₪{Math.round(amount).toLocaleString()}
      </span>
    </div>
  );
}

// ── Budget categories ────────────────────────────────────────────────────────
function BudgetSection({
  categories,
  monthLabel,
  onOpenCategory,
  onEditBudget,
}: {
  categories: BudgetCategory[];
  monthLabel: string;
  onOpenCategory: (c: BudgetCategory) => void;
  onEditBudget: (c: BudgetCategory) => void;
}) {
  return (
    <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
      <SectionTitle text="תקציב - חודש נוכחי" color="#A78BFA" />
      <span className="label-cap" style={{ display: "block", marginBottom: 14 }}>
        {monthLabel}
      </span>
      {categories.length === 0 ? (
        <Empty text="לא נמצאו קטגוריות" />
      ) : (
        <div className="mm-gallery">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              c={c}
              onClick={() => onOpenCategory(c)}
              onEditBudget={() => onEditBudget(c)}
            />
          ))}
        </div>
      )}
      <style>{`
        .mm-gallery {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 560px) { .mm-gallery { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 960px) { .mm-gallery { grid-template-columns: 1fr 1fr 1fr; } }
        .cat-card {
          cursor: pointer;
          transition: border-color 160ms, background 160ms;
          position: relative;
        }
        .cat-card:hover {
          border-color: rgba(167,139,250,0.3);
          background: rgba(10,12,28,0.75);
        }
      `}</style>
    </section>
  );
}

function CategoryCard({
  c,
  onClick,
  onEditBudget,
}: {
  c: BudgetCategory;
  onClick: () => void;
  onEditBudget: () => void;
}) {
  const noBudget = c.budget === 0 && c.spent > 0;
  const displayPct = noBudget ? 100 : Math.min(c.percent, 100);
  const filled = Math.max(0, Math.min(Math.round((displayPct / 100) * 7), 7));
  const squareColor = squareColorFor(c, noBudget);
  const isSavings = c.type === "חסכון";
  const remainingLabel = isSavings ? "כמה עוד להשקיע?" : "כמה נשאר לבזבז?";
  const remainingAmount = c.budget - c.spent;

  return (
    <button
      type="button"
      onClick={onClick}
      className="cat-card"
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(10,12,28,0.55)",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "start",
        fontFamily: "inherit",
        width: "100%",
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 6 }}>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onEditBudget();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onEditBudget();
            }
          }}
          aria-label="ערוך תקציב"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "rgba(167,139,250,0.12)",
            border: "1px solid rgba(167,139,250,0.28)",
            color: "#A78BFA",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </span>
        <div className="flex items-center" style={{ gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#F5F6FF" }}>{c.name}</span>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{c.emoji || "📊"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 14,
                borderRadius: 2,
                background: i < filled ? squareColor : "rgba(255,255,255,0.08)",
                boxShadow: i < filled ? `0 0 6px ${squareColor}40` : "none",
                transition: "background 300ms",
              }}
            />
          ))}
        </div>
        <span
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: squareColor,
            minWidth: 34,
            textAlign: "end",
          }}
        >
          {noBudget ? "—" : `${Math.round(c.percent)}%`}
        </span>
      </div>
      <div className="flex items-center justify-between" style={{ gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10.5,
            padding: "3px 10px",
            borderRadius: 6,
            background: noBudget
              ? "rgba(251,113,133,0.14)"
              : "rgba(52,211,153,0.12)",
            color: noBudget ? "#FB7185" : "#34D399",
            fontWeight: 600,
          }}
        >
          {noBudget ? "לא הוגדר תקציב" : remainingLabel}
        </span>
        <span
          className="mono currency"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: noBudget || remainingAmount < 0 ? "#FB7185" : "#F5F6FF",
          }}
        >
          {noBudget
            ? `−₪${Math.round(c.spent).toLocaleString()}`
            : `₪${Math.round(Math.abs(remainingAmount)).toLocaleString()}`}
        </span>
      </div>
    </button>
  );
}

function squareColorFor(c: BudgetCategory, noBudget: boolean): string {
  if (noBudget) return "#FB7185";
  if (c.percent === 0) return "#6B7094";
  if (c.type === "חסכון" && c.percent >= 100) return "#A78BFA";
  if (c.percent >= 100) return "#FB7185";
  if (c.percent >= 70) return "#FBBF24";
  return "#34D399";
}

// ── Income table ─────────────────────────────────────────────────────────────
function IncomeSection({
  txs,
  total,
  monthLabel,
  onOpenModal,
}: {
  txs: BudgetTransaction[];
  total: number;
  monthLabel: string;
  onOpenModal: OpenModal;
}) {
  return (
    <section className="glass" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
      <SectionHeader
        title={`הכנסות - ${monthLabel}`}
        color="#34D399"
        onAdd={() => onOpenModal({ mode: "create", kind: "income" })}
      />
      {txs.length === 0 ? (
        <Empty text="לא נמצאו הכנסות החודש" />
      ) : (
        <TxTable
          rows={txs}
          total={total}
          accent="#34D399"
          fallbackCat="הכנסה"
          onRowClick={(tx) => onOpenModal({ mode: "edit", kind: "income", tx })}
        />
      )}
    </section>
  );
}

// ── Expenses table ───────────────────────────────────────────────────────────
function ExpensesSection({
  txs,
  total,
  monthLabel,
  onOpenModal,
}: {
  txs: BudgetTransaction[];
  total: number;
  monthLabel: string;
  onOpenModal: OpenModal;
}) {
  return (
    <section className="glass" style={{ ["--i" as string]: 4 } as React.CSSProperties}>
      <SectionHeader
        title={`הוצאות שבוצעו - ${monthLabel}`}
        color="#FB7185"
        onAdd={() => onOpenModal({ mode: "create", kind: "expense" })}
      />
      {txs.length === 0 ? (
        <Empty text="לא נמצאו הוצאות החודש" />
      ) : (
        <TxTable
          rows={txs}
          total={total}
          accent="#FB7185"
          fallbackCat="לא שובץ"
          onRowClick={(tx) => onOpenModal({ mode: "edit", kind: "expense", tx })}
        />
      )}
    </section>
  );
}

function SectionHeader({
  title,
  color,
  onAdd,
}: {
  title: string;
  color: string;
  onAdd: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ marginBottom: 14, gap: 8 }}
    >
      <button
        type="button"
        onClick={onAdd}
        aria-label="הוסף"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `${color}22`,
          border: `1px solid ${color}48`,
          color,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <h2
        className="mono"
        style={{
          fontSize: 15,
          fontWeight: 700,
          color,
          flex: 1,
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {/* spacer so the title stays centered */}
      <span style={{ width: 28 }} />
    </div>
  );
}

// ── Shared table ─────────────────────────────────────────────────────────────
function TxTable({
  rows,
  total,
  accent,
  fallbackCat,
  onRowClick,
}: {
  rows: BudgetTransaction[];
  total: number;
  accent: string;
  fallbackCat: string;
  onRowClick: (tx: BudgetTransaction) => void;
}) {
  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-3"
        style={{
          padding: "6px 0 10px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "#6B7094",
          textTransform: "uppercase",
        }}
      >
        <span style={{ flex: 1 }}>שם</span>
        <span className="mono" style={{ minWidth: 90, textAlign: "end" }}>סכום</span>
        <span style={{ minWidth: 110, textAlign: "end" }}>קטגוריה</span>
      </div>
      {rows.map((t, i) => (
        <button
          type="button"
          key={t.id}
          onClick={() => onRowClick(t)}
          className="flex items-center gap-3 tx-row"
          style={{
            padding: "10px 6px",
            borderBottom: i === rows.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            width: "100%",
            textAlign: "start",
            fontFamily: "inherit",
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 13,
              color: "#F5F6FF",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t.name}
          </span>
          <span
            className="mono currency"
            style={{ minWidth: 90, textAlign: "end", fontSize: 13, fontWeight: 600, color: "#F5F6FF" }}
          >
            ₪{Math.round(t.amount).toLocaleString()}
          </span>
          <span
            style={{
              minWidth: 120,
              textAlign: "end",
              fontSize: 11.5,
              color: "#B4B8D4",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: "underline",
              textDecorationColor: "rgba(255,255,255,0.15)",
              textUnderlineOffset: 3,
            }}
          >
            {t.categoryEmoji ? `${t.categoryEmoji} ` : t.categoryName ? "" : "🚫 "}
            {t.categoryName ?? fallbackCat}
          </span>
        </button>
      ))}
      <div
        className="flex items-center justify-end gap-3"
        style={{
          padding: "12px 0 4px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          marginTop: 4,
        }}
      >
        <span className="label-cap" style={{ color: accent }}>SUM</span>
        <span className="mono currency" style={{ fontSize: 16, fontWeight: 700, color: accent }}>
          ₪{Math.round(total).toLocaleString()}
        </span>
      </div>
      <style>{`
        .tx-row { transition: background 120ms; }
        .tx-row:hover { background: rgba(255,255,255,0.04); }
      `}</style>
    </div>
  );
}

// ── Section title ────────────────────────────────────────────────────────────
function SectionTitle({ text, color }: { text: string; color: string }) {
  return (
    <h2
      className="mono"
      style={{
        fontSize: 15,
        fontWeight: 700,
        color,
        textAlign: "center",
        letterSpacing: "-0.01em",
        marginBottom: 14,
      }}
    >
      {text}
    </h2>
  );
}

// ── Placeholders ─────────────────────────────────────────────────────────────
function Empty({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, color: "#6B7094", textAlign: "center", padding: "16px 0" }}>
      {text}
    </div>
  );
}

function LoadingState() {
  return (
    <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
      <div style={{ padding: "48px 0", textAlign: "center", color: "#6B7094", fontSize: 13 }}>
        טוען את Money Master מ-Notion…
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
      <div style={{ padding: "32px 0", textAlign: "center", color: "#FB7185", fontSize: 13 }}>
        שגיאה בטעינת התקציב: {message}
      </div>
    </section>
  );
}

function ConfigMissing({ missing }: { missing: string[] }) {
  return (
    <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
      <div style={{ padding: "32px 0", textAlign: "center", color: "#B4B8D4", fontSize: 13, lineHeight: 1.6 }}>
        חסר הגדרה של משתני סביבה ל-Money Master:
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
          {missing.map((key) => (
            <li key={key} style={{ fontSize: 12 }}>
              <code style={{ color: "#A78BFA" }}>{key}</code>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 12, fontSize: 11.5 }}>
          בנוסף, ה-server צריך <code style={{ color: "#A78BFA" }}>NOTION_MM_API_TOKEN</code>.
        </div>
      </div>
    </section>
  );
}

export default Budget;
