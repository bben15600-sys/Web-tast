import type { BudgetData } from "@/hooks/useBudgetData";

/**
 * Compact Hebrew digest of the user's current month state.
 * Injected into the AI chat so it can answer questions like
 * "כמה הוצאתי על בילויים?" without hallucinating.
 */
export function buildBudgetChatContext(
  data: BudgetData,
  previous?: BudgetData | null,
): string {
  const { totals, categories, transactions, monthLabel } = data;
  const lines: string[] = [];

  lines.push(`=== נתוני Money Master · ${monthLabel} ===`);
  lines.push(`הכנסות: ₪${Math.round(totals.income).toLocaleString()}`);
  lines.push(`הוצאות: ₪${Math.round(totals.expense).toLocaleString()}`);
  lines.push(`מאזן: ₪${Math.round(totals.net).toLocaleString()}`);
  lines.push(`חסכונות והשקעות: ₪${Math.round(totals.savings).toLocaleString()}`);

  const spentCats = categories
    .filter((c) => c.spent > 0 || c.budget > 0)
    .sort((a, b) => b.spent - a.spent);
  if (spentCats.length > 0) {
    lines.push("");
    lines.push("קטגוריות (הוצאה / תקציב / % ניצול):");
    for (const c of spentCats.slice(0, 20)) {
      const emoji = c.emoji ? `${c.emoji} ` : "";
      lines.push(
        `- ${emoji}${c.name} [${c.type ?? "?"}]: ₪${Math.round(c.spent).toLocaleString()} / ₪${Math.round(c.budget).toLocaleString()} (${Math.round(c.percent)}%)`,
      );
    }
  }

  const EXPENSE_LIMIT = 30;
  const INCOME_LIMIT = 10;
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length > 0) {
    lines.push("");
    const truncated = expenses.length > EXPENSE_LIMIT;
    lines.push(
      truncated
        ? `הוצאות בחודש (מציג ${EXPENSE_LIMIT} אחרונות מתוך ${expenses.length} — יש עוד רשומות שלא נכללו):`
        : `${expenses.length} הוצאות בחודש:`,
    );
    for (const t of expenses.slice(0, EXPENSE_LIMIT)) {
      const date = `${String(t.date.getDate()).padStart(2, "0")}.${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      lines.push(
        `- ${date} · ${t.name} · ₪${Math.round(t.amount).toLocaleString()} · ${t.categoryName ?? "לא שובץ"}${t.paymentMethod ? ` · ${t.paymentMethod}` : ""}`,
      );
    }
  }

  const incomes = transactions.filter((t) => t.type === "income");
  if (incomes.length > 0) {
    lines.push("");
    const truncated = incomes.length > INCOME_LIMIT;
    lines.push(
      truncated
        ? `הכנסות בחודש (מציג ${INCOME_LIMIT} אחרונות מתוך ${incomes.length}):`
        : `${incomes.length} הכנסות בחודש:`,
    );
    for (const t of incomes.slice(0, INCOME_LIMIT)) {
      const date = `${String(t.date.getDate()).padStart(2, "0")}.${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      lines.push(
        `- ${date} · ${t.name} · +₪${Math.round(t.amount).toLocaleString()}${t.categoryName ? ` · ${t.categoryName}` : ""}`,
      );
    }
  }

  if (previous) {
    lines.push("");
    lines.push(`=== נתוני חודש קודם · ${previous.monthLabel} (להשוואה) ===`);
    const diffs = (cur: number, prev: number) => {
      if (prev === 0) return cur === 0 ? "0%" : "חדש";
      const pct = ((cur - prev) / prev) * 100;
      const sign = pct >= 0 ? "+" : "";
      return `${sign}${pct.toFixed(1)}%`;
    };
    lines.push(
      `הכנסות: ₪${Math.round(previous.totals.income).toLocaleString()} (שינוי ${diffs(totals.income, previous.totals.income)})`,
    );
    lines.push(
      `הוצאות: ₪${Math.round(previous.totals.expense).toLocaleString()} (שינוי ${diffs(totals.expense, previous.totals.expense)})`,
    );
    lines.push(
      `חסכונות: ₪${Math.round(previous.totals.savings).toLocaleString()} (שינוי ${diffs(totals.savings, previous.totals.savings)})`,
    );

    // Highlight categories that moved by ₪200+ month-over-month.
    const priorByName = new Map(previous.categories.map((c) => [c.name, c.spent]));
    const movers: Array<{ name: string; emoji: string; delta: number; prev: number; cur: number }> = [];
    for (const c of categories) {
      const prev = priorByName.get(c.name) ?? 0;
      const delta = c.spent - prev;
      if (Math.abs(delta) >= 200) {
        movers.push({ name: c.name, emoji: c.emoji, delta, prev, cur: c.spent });
      }
    }
    if (movers.length > 0) {
      movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      lines.push("");
      lines.push("קטגוריות עם שינוי משמעותי מחודש לחודש:");
      for (const m of movers.slice(0, 8)) {
        const emoji = m.emoji ? `${m.emoji} ` : "";
        const arrow = m.delta > 0 ? "+" : "";
        lines.push(
          `- ${emoji}${m.name}: ₪${Math.round(m.cur).toLocaleString()} (${arrow}₪${Math.round(m.delta).toLocaleString()} מול ₪${Math.round(m.prev).toLocaleString()} בחודש קודם)`,
        );
      }
    }
  }

  return lines.join("\n");
}
