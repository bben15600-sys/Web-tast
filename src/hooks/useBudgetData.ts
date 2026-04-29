import { useQuery } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  extractTitle,
  extractRichText,
  extractSelect,
  extractNumber,
  extractDate,
  extractRelation,
  extractFormulaNumber,
  extractFormulaString,
  extractRollupNumber,
  type NotionPage,
} from "@/lib/notion";

export type BudgetTransaction = {
  id: string;
  type: "expense" | "income";
  name: string;
  amount: number;
  date: Date;
  paymentMethod: string | null;
  frequency: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  notes: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  emoji: string;
  group: string | null;
  type: string | null;
  fixedVariable: string | null;
  budget: number;
  spent: number;
  remaining: number;
  percent: number;
  sort: number;
  color: string;
};

export type BudgetData = {
  transactions: BudgetTransaction[];
  categories: BudgetCategory[];
  totals: {
    expense: number;
    income: number;
    net: number;
    savings: number;
  };
  monthLabel: string;
};

export type UseBudgetDataResult = {
  data: BudgetData | null;
  reference: Date;
  isLoading: boolean;
  error: string | null;
  isConfigMissing: boolean;
  missingKeys: string[];
};

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// Budget_Database "אפריל" / "מאי" / ... columns, indexed by JS month (0-based).
const MONTH_BUDGET_COLUMNS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// Stable color palette for categories. Used when no emoji-derived color is obvious.
const FALLBACK_PALETTE = [
  "#60A5FA", "#34D399", "#FB7185", "#A78BFA", "#FBBF24",
  "#22D3EE", "#F472B6", "#F97316", "#A3E635", "#818CF8",
];

const GROUP_COLORS: Record<string, string> = {
  "אוכל ובילויים": "#FB7185",
  "דיור": "#A78BFA",
  "רכב": "#60A5FA",
  "משפחה": "#34D399",
  "בריאות": "#FBBF24",
  "חסכון": "#22D3EE",
};

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfNextMonth(d: Date): Date {
  const out = startOfMonth(d);
  out.setMonth(out.getMonth() + 1);
  return out;
}

function colorForCategory(group: string | null, idx: number): string {
  if (group && GROUP_COLORS[group]) return GROUP_COLORS[group];
  return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

function pageToExpense(page: NotionPage): BudgetTransaction | null {
  const amount = extractNumber(page.properties["סכום"]);
  const datePart = extractDate(page.properties["תאריך"]);
  if (amount == null || !datePart) return null;

  const categoryIds = extractRelation(page.properties["קטגוריה"]);
  const categoryNameFormula = extractFormulaString(page.properties["קטגוריה בטקסט"]);

  return {
    id: page.id,
    type: "expense",
    name: extractTitle(page.properties["שם"]) || "(ללא שם)",
    amount: Math.abs(amount),
    date: new Date(datePart.start),
    paymentMethod: extractSelect(page.properties["אמצעי תשלום"]),
    frequency: extractSelect(page.properties["תדירות"]),
    categoryId: categoryIds[0] ?? null,
    categoryName: categoryNameFormula || null,
    categoryEmoji: null,
    notes: extractRichText(page.properties["הערות"]),
  };
}

function pageToIncome(page: NotionPage): BudgetTransaction | null {
  const amount = extractNumber(page.properties["סכום"]);
  const datePart = extractDate(page.properties["תאריך"]);
  if (amount == null || !datePart) return null;

  return {
    id: page.id,
    type: "income",
    name: extractTitle(page.properties["שם"]) || "(ללא שם)",
    amount: Math.abs(amount),
    date: new Date(datePart.start),
    paymentMethod: extractSelect(page.properties["אמצעי תשלום"]),
    frequency: extractSelect(page.properties["תדירות"]),
    categoryId: null,
    categoryName: extractSelect(page.properties["Apple Shortcut"]),
    categoryEmoji: null,
    notes: extractRichText(page.properties["הערות"]),
  };
}

function pageToCategory(
  page: NotionPage,
  reference: Date,
  idx: number,
): BudgetCategory | null {
  const name = extractTitle(page.properties["name"]);
  if (!name) return null;

  // Prefer the pre-computed current-month formulas if they exist; otherwise fall
  // back to the per-month column + `תקציב אחיד`, and compute the rest client-side.
  const formulaBudget = extractFormulaNumber(page.properties["תקציב - חודש נוכחי"]);
  const formulaSpent = extractFormulaNumber(page.properties["הוצאות - חודש נוכחי"])
    ?? extractRollupNumber(page.properties["הוצאות - חודש נוכחי"]);
  const formulaRemaining = extractFormulaNumber(page.properties["כמה נשאר - חודש נוכחי"]);
  const formulaPercent = extractFormulaNumber(page.properties["אחוזים - חודש נוכחי"]);

  const monthColumn = MONTH_BUDGET_COLUMNS[reference.getMonth()];
  const monthOverride = extractNumber(page.properties[monthColumn]);
  const unifiedBudget = extractNumber(page.properties["תקציב אחיד"]);
  const budget = formulaBudget ?? monthOverride ?? unifiedBudget ?? 0;

  const spent = formulaSpent ?? 0;
  const remaining = formulaRemaining ?? budget - spent;
  const percent = formulaPercent ?? (budget > 0 ? (spent / budget) * 100 : 0);

  const group = extractSelect(page.properties["נושא הקטגוריה"]);
  const iconEmoji =
    (page as unknown as { icon?: { type?: string; emoji?: string } }).icon?.emoji ?? "";
  const propEmoji = extractRichText(page.properties["Emoji"]);
  const emoji = iconEmoji || propEmoji || "";

  return {
    id: page.id,
    name,
    emoji,
    group,
    type: extractSelect(page.properties["סוג"]),
    fixedVariable: extractSelect(page.properties["קבועה / משתנה"]),
    budget,
    spent,
    remaining,
    percent,
    sort: extractNumber(page.properties["Sort"]) ?? idx,
    color: colorForCategory(group, idx),
  };
}

type MoneyMasterConfig = {
  expenses?: string;
  income?: string;
  budget?: string;
  reference?: Date;
  monthOffset?: number;
  /**
   * Skip all three Notion queries when false. Useful for screens where the
   * hook must be called unconditionally (React rules) but the data is only
   * needed in specific states (e.g. chat only needs it in the general tab).
   */
  enabled?: boolean;
};

export function useBudgetData(config: MoneyMasterConfig = {}): UseBudgetDataResult {
  const enabled = config.enabled ?? true;
  const expensesId = config.expenses ?? import.meta.env.VITE_NOTION_EXPENSES_DB_ID;
  const incomeId = config.income ?? import.meta.env.VITE_NOTION_INCOME_DB_ID;
  const budgetId = config.budget ?? import.meta.env.VITE_NOTION_BUDGET_DB_ID;
  const baseRef = config.reference ?? new Date();
  const reference = (() => {
    if (!config.monthOffset) return baseRef;
    const d = new Date(baseRef);
    d.setDate(1);
    d.setMonth(d.getMonth() + config.monthOffset);
    return d;
  })();
  const monthStart = startOfMonth(reference);
  const monthEnd = startOfNextMonth(reference);
  const monthKey = monthStart.toISOString();

  const missingKeys: string[] = [];
  if (!expensesId) missingKeys.push("VITE_NOTION_EXPENSES_DB_ID");
  if (!incomeId) missingKeys.push("VITE_NOTION_INCOME_DB_ID");
  if (!budgetId) missingKeys.push("VITE_NOTION_BUDGET_DB_ID");

  const expensesQuery = useQuery<NotionPage[]>({
    queryKey: ["mm", "expenses", expensesId, monthKey],
    enabled: enabled && Boolean(expensesId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await queryNotionDatabase(
        {
          databaseId: expensesId!,
          filter: {
            and: [
              { property: "תאריך", date: { on_or_after: monthStart.toISOString() } },
              { property: "תאריך", date: { before: monthEnd.toISOString() } },
            ],
          },
          sorts: [{ property: "תאריך", direction: "descending" }],
          page_size: 100,
          integration: "mm",
        },
        signal,
      );
      return response.results;
    },
  });

  const incomeQuery = useQuery<NotionPage[]>({
    queryKey: ["mm", "income", incomeId, monthKey],
    enabled: enabled && Boolean(incomeId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await queryNotionDatabase(
        {
          databaseId: incomeId!,
          filter: {
            and: [
              { property: "תאריך", date: { on_or_after: monthStart.toISOString() } },
              { property: "תאריך", date: { before: monthEnd.toISOString() } },
            ],
          },
          sorts: [{ property: "תאריך", direction: "descending" }],
          page_size: 100,
          integration: "mm",
        },
        signal,
      );
      return response.results;
    },
  });

  const categoriesQuery = useQuery<NotionPage[]>({
    queryKey: ["mm", "categories", budgetId],
    enabled: enabled && Boolean(budgetId),
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const response = await queryNotionDatabase(
        {
          databaseId: budgetId!,
          sorts: [{ property: "Sort", direction: "ascending" }],
          page_size: 100,
          integration: "mm",
        },
        signal,
      );
      return response.results;
    },
  });

  const isConfigMissing = missingKeys.length > 0;
  const isLoading = enabled && (
    (expensesQuery.isLoading && Boolean(expensesId)) ||
    (incomeQuery.isLoading && Boolean(incomeId)) ||
    (categoriesQuery.isLoading && Boolean(budgetId))
  );

  const firstError = expensesQuery.error || incomeQuery.error || categoriesQuery.error;
  const error = firstError instanceof Error ? firstError.message : firstError ? "Unknown error" : null;

  let data: BudgetData | null = null;
  if (
    !isConfigMissing &&
    expensesQuery.data &&
    incomeQuery.data &&
    categoriesQuery.data
  ) {
    const expenseTxs = expensesQuery.data
      .map((p) => pageToExpense(p))
      .filter((t): t is BudgetTransaction => t != null);
    const incomeTxs = incomeQuery.data
      .map(pageToIncome)
      .filter((t): t is BudgetTransaction => t != null);

    const transactions = [...expenseTxs, ...incomeTxs].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );

    const categories = categoriesQuery.data
      .map((p, i) => pageToCategory(p, reference, i))
      .filter((c): c is BudgetCategory => c != null)
      .sort((a, b) => a.sort - b.sort);

    // Fill in missing category names / emojis on expense transactions.
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    for (const tx of transactions) {
      if (tx.type === "expense" && tx.categoryId) {
        const cat = categoryById.get(tx.categoryId);
        if (cat) {
          if (!tx.categoryName) tx.categoryName = cat.name;
          tx.categoryEmoji = cat.emoji || null;
        }
      }
    }

    // Compute per-category spent client-side. Notion's
    // `הוצאות - חודש נוכחי` rollup is unreliable in some workspaces
    // (returns 0 when the relation isn't indexed yet), so we always
    // prefer our own aggregation of the current-month expenses.
    const spentByCategoryId = new Map<string, number>();
    for (const tx of expenseTxs) {
      if (tx.categoryId) {
        spentByCategoryId.set(
          tx.categoryId,
          (spentByCategoryId.get(tx.categoryId) ?? 0) + tx.amount,
        );
      }
    }
    for (const cat of categories) {
      const computed = spentByCategoryId.get(cat.id);
      if (computed != null) cat.spent = computed;
      cat.remaining = cat.budget - cat.spent;
      cat.percent = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
    }

    // "חסכונות והשקעות" — expenses categorised as `סוג` that looks like savings.
    // Accept both Notion's canonical "חסכון" and common user variants.
    const savingsTypes = new Set(["חסכון", "חסכונות", "השקעה", "השקעות"]);
    const savingsCategoryIds = new Set(
      categories.filter((c) => c.type && savingsTypes.has(c.type)).map((c) => c.id),
    );
    const savings = expenseTxs
      .filter((t) => t.categoryId && savingsCategoryIds.has(t.categoryId))
      .reduce((s, t) => s + t.amount, 0);

    const totals = {
      expense: expenseTxs.reduce((s, t) => s + t.amount, 0),
      income: incomeTxs.reduce((s, t) => s + t.amount, 0),
      net: 0,
      savings,
    };
    totals.net = totals.income - totals.expense;

    data = {
      transactions,
      categories,
      totals,
      monthLabel: `${HEBREW_MONTHS[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
    };
  }

  return { data, reference, isLoading, error, isConfigMissing, missingKeys };
}
