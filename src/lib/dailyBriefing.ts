import type { BudgetData, BudgetTransaction } from "@/hooks/useBudgetData";
import type { Goal } from "@/hooks/useGoals";
import type { TodayEvent } from "@/hooks/useTodayEvents";
import type { ScheduleEvent } from "@/hooks/useScheduleEvents";
import type { Holding } from "@/hooks/useInvestments";
import type { YahooQuote } from "@/hooks/useYahooQuotes";

export type BriefingAlertSeverity = "critical" | "warning" | "info";

export type BriefingAlertIcon =
  | "budget"
  | "market"
  | "deposit"
  | "calendar"
  | "goal";

export type BriefingAlert = {
  id: string;
  severity: BriefingAlertSeverity;
  icon: BriefingAlertIcon;
  title: string;
  detail: string;
  href?: string;
  priority: number;
};

export type LookaheadDay = {
  iso: string;
  date: Date;
  letterHe: string;
  dom: number;
  isToday: boolean;
  isWeekend: boolean;
  eventCount: number;
  upcomingBillTotal: number;
  density: "light" | "medium" | "heavy";
  events: Array<{ id: string; title: string; time: string }>;
  bills: Array<{ name: string; amount: number }>;
};

export type InsightContext = {
  date: string;
  greetingPart: "morning" | "afternoon" | "evening";
  todayEvents: Array<{ title: string; time: string }>;
  budget?: {
    monthLabel: string;
    spent: number;
    budget: number;
    percent: number;
    projectedPercent: number;
    daysRemaining: number;
    overshootCategories: Array<{ name: string; percent: number; over: number }>;
  };
  market?: {
    holdings: Array<{ name: string; symbol: string; changePct: number }>;
    portfolioChangeIls: number | null;
  };
  goals: Array<{ label: string; done: number; target: number; atRisk: boolean }>;
  upcomingBills: Array<{ name: string; date: string; amount: number }>;
};

export type BriefingSummary = {
  alerts: BriefingAlert[];
  hero: {
    todayEventCount: number | null;
    goalsDone: number;
    goalsTotal: number;
    budgetPercent: number | null;
  };
  lookahead: LookaheadDay[];
  insightContext: InsightContext;
  weekStats: {
    eventsTotal: number;
    estimatedHours: number;
    recurringBillsTotal: number;
    portfolioChangeIls: number | null;
  };
};

export type BriefingInputs = {
  now?: Date;
  goals: Goal[];
  todayEvents: TodayEvent[];
  weekEvents?: ScheduleEvent[][];
  weekStart?: Date;
  budget: BudgetData | null;
  holdings: Holding[];
  quotes: Record<string, YahooQuote>;
  monthlyDeposit?: { amount: number; nextDate: string } | null;
};

const HEBREW_DAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000,
  );
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function priorityOf(sev: BriefingAlertSeverity): number {
  return sev === "critical" ? 0 : sev === "warning" ? 1 : 2;
}

function greetingPart(now: Date): "morning" | "afternoon" | "evening" {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function changeIlsForHolding(h: Holding, q: YahooQuote | undefined): number | null {
  if (!q || q.changePct == null) return null;
  return h.value * (q.changePct / 100);
}

function buildLookahead(
  now: Date,
  weekEvents: ScheduleEvent[][] | undefined,
  weekStart: Date | undefined,
  upcomingBills: BudgetTransaction[],
): LookaheadDay[] {
  const today = startOfDay(now);
  const days: LookaheadDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    let eventCount = 0;
    let dayEvents: ScheduleEvent[] = [];
    if (weekEvents && weekStart) {
      const idx = daysBetween(weekStart, date);
      if (idx >= 0 && idx < weekEvents.length) {
        dayEvents = weekEvents[idx];
        eventCount = dayEvents.length;
      }
    }

    const billsToday = upcomingBills.filter(
      (t) => daysBetween(t.date, date) === 0,
    );
    const upcomingBillTotal = billsToday.reduce((s, t) => s + t.amount, 0);

    const density: LookaheadDay["density"] =
      eventCount >= 4 ? "heavy" : eventCount >= 2 ? "medium" : "light";

    days.push({
      iso: date.toISOString().slice(0, 10),
      date,
      letterHe: HEBREW_DAY_LETTERS[date.getDay()],
      dom: date.getDate(),
      isToday: i === 0,
      isWeekend: date.getDay() === 5 || date.getDay() === 6,
      eventCount,
      upcomingBillTotal,
      density,
      events: dayEvents.map((e) => ({ id: e.id, title: e.title, time: e.time })),
      bills: billsToday.map((b) => ({ name: b.name, amount: b.amount })),
    });
  }

  return days;
}

function selectUpcomingBills(
  budget: BudgetData | null,
  now: Date,
  windowDays = 7,
): BudgetTransaction[] {
  if (!budget) return [];
  const start = startOfDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + windowDays);
  return budget.transactions.filter((t) => {
    if (t.type !== "expense") return false;
    if (!t.frequency) return false;
    return t.date >= start && t.date < end;
  });
}

function estimateWeeklyHours(weekEvents: ScheduleEvent[][] | undefined): number {
  if (!weekEvents) return 0;
  let totalMs = 0;
  for (const dayBucket of weekEvents) {
    for (const ev of dayBucket) {
      if (ev.end) {
        totalMs += Math.max(0, ev.end.getTime() - ev.start.getTime());
      } else {
        totalMs += 60 * 60 * 1000;
      }
    }
  }
  return Math.round(totalMs / 360_000) / 10;
}

export function computeBriefing(inputs: BriefingInputs): BriefingSummary {
  const now = inputs.now ?? new Date();
  const today = startOfDay(now);

  const alerts: BriefingAlert[] = [];

  // ── Budget alerts ──
  let budgetPercent: number | null = null;
  let projectedPercent = 0;
  let daysRemainingInMonth = 0;
  let totalBudget = 0;
  const overshootCategories: Array<{ name: string; percent: number; over: number }> = [];

  if (inputs.budget) {
    totalBudget = inputs.budget.categories.reduce((s, c) => s + c.budget, 0);
    const totalSpent = inputs.budget.totals.expense;
    budgetPercent =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : null;

    const dom = now.getDate();
    const dim = daysInMonth(now);
    daysRemainingInMonth = dim - dom;
    if (totalBudget > 0 && dom > 0) {
      projectedPercent = Math.round(((totalSpent / dom) * dim / totalBudget) * 100);
    }

    for (const cat of inputs.budget.categories) {
      if (cat.budget <= 0) continue;
      if (cat.percent >= 100) {
        const over = Math.round(cat.spent - cat.budget);
        overshootCategories.push({ name: cat.name, percent: Math.round(cat.percent), over });
        alerts.push({
          id: `budget-over:${cat.id}`,
          severity: "critical",
          icon: "budget",
          title: `${cat.emoji ? cat.emoji + " " : ""}${cat.name} — חריגה מתקציב`,
          detail:
            cat.remaining < 0
              ? `נוצל ${Math.round(cat.percent)}% · חריגה של ₪${Math.round(-cat.remaining).toLocaleString()}`
              : `נוצל ${Math.round(cat.percent)}% · נגמר התקציב`,
          href: "/budget",
          priority: priorityOf("critical") * 100 - Math.round(cat.percent),
        });
      } else if (cat.percent >= 90) {
        alerts.push({
          id: `budget-warn:${cat.id}`,
          severity: "warning",
          icon: "budget",
          title: `${cat.emoji ? cat.emoji + " " : ""}${cat.name} — מתקרב לגבול`,
          detail: `${Math.round(cat.percent)}% נוצל · נשארו ₪${Math.round(Math.max(cat.remaining, 0)).toLocaleString()}`,
          href: "/budget",
          priority: priorityOf("warning") * 100 - Math.round(cat.percent),
        });
      }
    }
  }

  // ── Market alerts ──
  const portfolioContextHoldings: NonNullable<InsightContext["market"]>["holdings"] = [];
  let portfolioChangeIls: number | null = null;

  for (const holding of inputs.holdings) {
    if (!holding.symbol) continue;
    const q = inputs.quotes[holding.symbol];
    if (q?.changePct != null) {
      portfolioContextHoldings.push({
        name: holding.name,
        symbol: holding.symbol,
        changePct: q.changePct,
      });

      const ilsChange = changeIlsForHolding(holding, q);
      if (ilsChange != null) {
        portfolioChangeIls = (portfolioChangeIls ?? 0) + ilsChange;
      }

      if (Math.abs(q.changePct) >= 3) {
        const up = q.changePct >= 0;
        alerts.push({
          id: `market:${holding.symbol}:${today.toISOString().slice(0, 10)}`,
          severity: up ? "info" : "warning",
          icon: "market",
          title: `${holding.name} ${up ? "קופצת" : "נופלת"} ${q.changePct.toFixed(2)}% היום`,
          detail: `${holding.symbol} · ${q.currency === "USD" ? "$" : "₪"}${q.price?.toFixed(2) ?? "—"}`,
          href: "/investments",
          priority: priorityOf(up ? "info" : "warning") * 100 + Math.round(-Math.abs(q.changePct)),
        });
      }
    }
  }

  // ── Upcoming bills (next 7 days) ──
  const upcomingBills = selectUpcomingBills(inputs.budget, now, 7);
  const upcomingBillsContextItems: InsightContext["upcomingBills"] = upcomingBills
    .slice(0, 8)
    .map((t) => ({
      name: t.name,
      date: t.date.toISOString().slice(0, 10),
      amount: t.amount,
    }));

  if (upcomingBills.length > 0) {
    const billsByDate = new Map<string, BudgetTransaction[]>();
    for (const t of upcomingBills) {
      const key = t.date.toISOString().slice(0, 10);
      const bucket = billsByDate.get(key) ?? [];
      bucket.push(t);
      billsByDate.set(key, bucket);
    }
    const totalUpcoming = upcomingBills.reduce((s, t) => s + t.amount, 0);
    const dates = [...billsByDate.keys()].sort();
    const firstDate = new Date(dates[0]);
    const daysAway = daysBetween(now, firstDate);
    if (daysAway <= 3) {
      const names = upcomingBills.slice(0, 3).map((t) => t.name).join(" + ");
      alerts.push({
        id: `bills:${dates.join(",")}`,
        severity: daysAway === 0 ? "critical" : "warning",
        icon: "deposit",
        title:
          daysAway === 0
            ? `חיובים היום: ${names}`
            : `${names} בעוד ${daysAway} ימים`,
        detail: `סה"כ ₪${Math.round(totalUpcoming).toLocaleString()} ב-${dates.length} תאריכים`,
        href: "/budget",
        priority: priorityOf(daysAway === 0 ? "critical" : "warning") * 100 + daysAway,
      });
    }
  }

  // ── Monthly deposit reminder (manually configured via Investments page) ──
  if (inputs.monthlyDeposit) {
    const next = new Date(inputs.monthlyDeposit.nextDate);
    if (!Number.isNaN(next.getTime())) {
      const daysAway = daysBetween(now, next);
      if (daysAway >= 0 && daysAway <= 3) {
        alerts.push({
          id: `deposit:${inputs.monthlyDeposit.nextDate}`,
          severity: daysAway === 0 ? "critical" : "info",
          icon: "deposit",
          title:
            daysAway === 0
              ? "הפקדה חודשית היום"
              : `הפקדה חודשית בעוד ${daysAway} ימים`,
          detail: `₪${Math.round(inputs.monthlyDeposit.amount).toLocaleString()}`,
          href: "/investments",
          priority: priorityOf(daysAway === 0 ? "critical" : "info") * 100 + daysAway,
        });
      }
    }
  }

  // ── Goals at risk ──
  // A weekly goal is "at risk" if remaining sessions > days remaining in the
  // week (assuming Sun-start week). We don't know real session distribution,
  // so we use simple heuristics.
  const dayOfWeek = now.getDay();
  const daysRemainingInWeek = 6 - dayOfWeek;
  for (const g of inputs.goals) {
    if (g.target <= 0) continue;
    const remaining = g.target - g.done;
    if (remaining <= 0) continue;
    if (remaining > daysRemainingInWeek + 1 && daysRemainingInWeek <= 3) {
      alerts.push({
        id: `goal-risk:${g.id}`,
        severity: "warning",
        icon: "goal",
        title: `${g.label} — בסיכון להיגמר השבוע`,
        detail: `נשארו ${remaining} מתוך ${g.target} · ${daysRemainingInWeek} ימים בשבוע`,
        priority: priorityOf("warning") * 100 + (10 - remaining),
      });
    }
  }

  // ── Sort alerts by priority (lower = first), then by severity ──
  alerts.sort((a, b) => a.priority - b.priority);

  // ── Hero metrics ──
  const goalsDone = inputs.goals.filter((g) => g.target > 0 && g.done >= g.target).length;
  const todayEventCount = inputs.todayEvents.length;

  // ── Lookahead ──
  const lookahead = buildLookahead(now, inputs.weekEvents, inputs.weekStart, upcomingBills);

  // ── Week stats ──
  const eventsTotal = inputs.weekEvents
    ? inputs.weekEvents.reduce((s, b) => s + b.length, 0)
    : 0;
  const recurringBillsTotal = upcomingBills.reduce((s, t) => s + t.amount, 0);
  const estimatedHours = estimateWeeklyHours(inputs.weekEvents);

  // ── Insight context (for AI endpoint) ──
  const insightContext: InsightContext = {
    date: today.toISOString().slice(0, 10),
    greetingPart: greetingPart(now),
    todayEvents: inputs.todayEvents.map((e) => ({ title: e.title, time: e.time })),
    budget: inputs.budget && totalBudget > 0
      ? {
          monthLabel: inputs.budget.monthLabel,
          spent: Math.round(inputs.budget.totals.expense),
          budget: Math.round(totalBudget),
          percent: budgetPercent ?? 0,
          projectedPercent,
          daysRemaining: daysRemainingInMonth,
          overshootCategories: overshootCategories.slice(0, 3),
        }
      : undefined,
    market: portfolioContextHoldings.length > 0
      ? {
          holdings: portfolioContextHoldings,
          portfolioChangeIls: portfolioChangeIls != null ? Math.round(portfolioChangeIls) : null,
        }
      : undefined,
    goals: inputs.goals.map((g) => ({
      label: g.label,
      done: g.done,
      target: g.target,
      atRisk:
        g.target > 0 &&
        g.target - g.done > daysRemainingInWeek + 1 &&
        daysRemainingInWeek <= 3,
    })),
    upcomingBills: upcomingBillsContextItems,
  };

  return {
    alerts,
    hero: {
      todayEventCount,
      goalsDone,
      goalsTotal: inputs.goals.length,
      budgetPercent,
    },
    lookahead,
    insightContext,
    weekStats: {
      eventsTotal,
      estimatedHours,
      recurringBillsTotal: Math.round(recurringBillsTotal),
      portfolioChangeIls: portfolioChangeIls != null ? Math.round(portfolioChangeIls) : null,
    },
  };
}
