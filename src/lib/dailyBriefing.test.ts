import { describe, it, expect } from "vitest";
import { computeBriefing } from "./dailyBriefing";
import type { BudgetData, BudgetCategory, BudgetTransaction } from "@/hooks/useBudgetData";
import type { Goal } from "@/hooks/useGoals";
import type { TodayEvent } from "@/hooks/useTodayEvents";
import type { ScheduleEvent } from "@/hooks/useScheduleEvents";
import type { Holding } from "@/hooks/useInvestments";
import type { YahooQuote } from "@/hooks/useYahooQuotes";

function cat(over: Partial<BudgetCategory> = {}): BudgetCategory {
  return {
    id: "c1",
    name: "מסעדות",
    emoji: "🍽️",
    group: null,
    type: null,
    fixedVariable: null,
    budget: 1000,
    spent: 500,
    remaining: 500,
    percent: 50,
    sort: 0,
    color: "#34D399",
    ...over,
  };
}

function budget(cats: BudgetCategory[], expense = 0): BudgetData {
  return {
    transactions: [],
    categories: cats,
    totals: { expense, income: 0, net: -expense, savings: 0 },
    monthLabel: "אפריל 2026",
  };
}

function tx(over: Partial<BudgetTransaction> = {}): BudgetTransaction {
  return {
    id: "t1",
    type: "expense",
    name: "סלקום",
    amount: 200,
    date: new Date("2026-04-27"),
    paymentMethod: null,
    frequency: "חודשי",
    categoryId: null,
    categoryName: null,
    categoryEmoji: null,
    notes: "",
    ...over,
  };
}

function goal(over: Partial<Goal> = {}): Goal {
  return { id: "g1", label: "כדורסל", done: 0, target: 3, color: "#34D399", ...over };
}

function holding(over: Partial<Holding> = {}): Holding {
  return {
    id: "h1",
    name: "Nvidia",
    symbol: "NVDA",
    value: 10000,
    changePct: 0,
    alloc: 0,
    changeColor: "#A78BFA",
    spark: "#A78BFA",
    data: [],
    ...over,
  };
}

function quote(over: Partial<YahooQuote> = {}): YahooQuote {
  return {
    symbol: "NVDA",
    name: "Nvidia",
    price: 100,
    previousClose: 100,
    change: 0,
    changePct: 0,
    currency: "USD",
    exchange: "NASDAQ",
    marketState: "REGULAR",
    ...over,
  };
}

const NOW = new Date("2026-04-25T10:00:00"); // Saturday morning

describe("computeBriefing", () => {
  it("handles empty input without crashing", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [],
      quotes: {},
    });
    expect(result.alerts).toEqual([]);
    expect(result.hero.todayEventCount).toBe(0);
    expect(result.hero.goalsTotal).toBe(0);
    expect(result.hero.budgetPercent).toBeNull();
    expect(result.lookahead).toHaveLength(7);
    expect(result.weekStats.eventsTotal).toBe(0);
  });

  it("flags categories at 100%+ as critical", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: budget([
        cat({ id: "food", name: "מסעדות", spent: 1200, budget: 1000, remaining: -200, percent: 120 }),
      ]),
      holdings: [],
      quotes: {},
    });
    const overAlert = result.alerts.find((a) => a.id === "budget-over:food");
    expect(overAlert).toBeDefined();
    expect(overAlert!.severity).toBe("critical");
    expect(overAlert!.detail).toContain("חריגה");
  });

  it("flags categories between 90-99% as warning", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: budget([
        cat({ id: "fuel", name: "דלק", spent: 950, budget: 1000, remaining: 50, percent: 95 }),
      ]),
      holdings: [],
      quotes: {},
    });
    const warnAlert = result.alerts.find((a) => a.id === "budget-warn:fuel");
    expect(warnAlert).toBeDefined();
    expect(warnAlert!.severity).toBe("warning");
  });

  it("ignores categories with zero budget", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: budget([
        cat({ id: "x", budget: 0, spent: 500, percent: 999 }),
      ]),
      holdings: [],
      quotes: {},
    });
    expect(result.alerts).toHaveLength(0);
  });

  it("flags market moves >=3% (negative as warning, positive as info)", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [holding({ symbol: "NVDA" })],
      quotes: { NVDA: quote({ changePct: -4.5 }) },
    });
    const a = result.alerts.find((x) => x.icon === "market");
    expect(a).toBeDefined();
    expect(a!.severity).toBe("warning");
    expect(a!.title).toContain("נופלת");

    const upResult = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [holding({ symbol: "NVDA" })],
      quotes: { NVDA: quote({ changePct: 5.2 }) },
    });
    const u = upResult.alerts.find((x) => x.icon === "market");
    expect(u!.severity).toBe("info");
    expect(u!.title).toContain("קופצת");
  });

  it("does not flag market moves <3%", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [holding({ symbol: "NVDA" })],
      quotes: { NVDA: quote({ changePct: 1.8 }) },
    });
    expect(result.alerts.filter((a) => a.icon === "market")).toHaveLength(0);
  });

  it("computes portfolio change in ILS by weighting holding values", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [
        holding({ id: "v", symbol: "VOO", value: 50000, name: "S&P 500" }),
        holding({ id: "n", symbol: "NVDA", value: 10000, name: "Nvidia" }),
      ],
      quotes: {
        VOO: quote({ symbol: "VOO", changePct: 1 }),  // +500 ILS
        NVDA: quote({ symbol: "NVDA", changePct: -2 }), // -200 ILS
      },
    });
    expect(result.weekStats.portfolioChangeIls).toBe(300);
  });

  it("flags upcoming bills within 3 days", () => {
    const billDate = new Date(NOW);
    billDate.setDate(billDate.getDate() + 2);
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: {
        ...budget([]),
        transactions: [tx({ name: "סלקום", amount: 250, date: billDate, frequency: "חודשי" })],
      },
      holdings: [],
      quotes: {},
    });
    const a = result.alerts.find((x) => x.icon === "deposit");
    expect(a).toBeDefined();
    expect(a!.severity).toBe("warning");
    expect(a!.detail).toContain("250");
  });

  it("does not flag bills more than 3 days away", () => {
    const billDate = new Date(NOW);
    billDate.setDate(billDate.getDate() + 5);
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: {
        ...budget([]),
        transactions: [tx({ date: billDate })],
      },
      holdings: [],
      quotes: {},
    });
    expect(result.alerts.filter((a) => a.icon === "deposit")).toHaveLength(0);
  });

  it("flags goals at risk only late in the week", () => {
    // NOW is Saturday (day 6). daysRemainingInWeek = 0. A goal needing 2 more
    // sessions with 0 days left is at risk.
    const result = computeBriefing({
      now: NOW,
      goals: [goal({ done: 0, target: 3 })],
      todayEvents: [],
      budget: null,
      holdings: [],
      quotes: {},
    });
    const a = result.alerts.find((x) => x.icon === "goal");
    expect(a).toBeDefined();
    expect(a!.severity).toBe("warning");
  });

  it("does not flag goals at risk early in the week", () => {
    const wednesday = new Date("2026-04-22T10:00:00"); // day 3
    const result = computeBriefing({
      now: wednesday,
      goals: [goal({ done: 0, target: 3 })],
      todayEvents: [],
      budget: null,
      holdings: [],
      quotes: {},
    });
    expect(result.alerts.filter((a) => a.icon === "goal")).toHaveLength(0);
  });

  it("counts hero metrics correctly", () => {
    const todayEvents: TodayEvent[] = [
      {
        id: "e1",
        title: "אימון",
        time: "17:00",
        bg: "#000",
        accent: "#fff",
        start: new Date(NOW),
      },
      {
        id: "e2",
        title: "פגישה",
        time: "20:00",
        bg: "#000",
        accent: "#fff",
        start: new Date(NOW),
      },
    ];
    const result = computeBriefing({
      now: NOW,
      goals: [
        goal({ id: "g1", done: 3, target: 3 }),
        goal({ id: "g2", done: 1, target: 3 }),
      ],
      todayEvents,
      budget: budget([cat({ budget: 1000 })], 250),
      holdings: [],
      quotes: {},
    });
    expect(result.hero.todayEventCount).toBe(2);
    expect(result.hero.goalsDone).toBe(1);
    expect(result.hero.goalsTotal).toBe(2);
    expect(result.hero.budgetPercent).toBe(25);
  });

  it("builds 7-day lookahead with today flagged and event counts", () => {
    const weekStart = new Date("2026-04-19T00:00:00"); // Sunday before NOW (Sat)
    const weekEvents: ScheduleEvent[][] = Array.from({ length: 7 }, () => []);
    // NOW is Saturday = index 6 in week. Fill it with 5 events to mark heavy.
    for (let i = 0; i < 5; i++) {
      weekEvents[6].push({
        id: `s${i}`,
        title: "x",
        time: "10:00",
        bg: "#000",
        accent: "#fff",
        start: new Date(NOW),
        end: null,
      });
    }
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      weekEvents,
      weekStart,
      budget: null,
      holdings: [],
      quotes: {},
    });
    expect(result.lookahead).toHaveLength(7);
    expect(result.lookahead[0].isToday).toBe(true);
    expect(result.lookahead[0].eventCount).toBe(5);
    expect(result.lookahead[0].density).toBe("heavy");
  });

  it("estimates weekly hours from events with end times", () => {
    const start = new Date("2026-04-25T17:00:00");
    const end = new Date("2026-04-25T18:30:00"); // 1.5h
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      weekEvents: [[], [], [], [], [], [], [{
        id: "e",
        title: "אימון",
        time: "17:00",
        bg: "#000",
        accent: "#fff",
        start,
        end,
      }]],
      weekStart: new Date("2026-04-19T00:00:00"),
      budget: null,
      holdings: [],
      quotes: {},
    });
    expect(result.weekStats.estimatedHours).toBe(1.5);
  });

  it("builds insight context with overshoot categories", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: budget([
        cat({ id: "food", name: "מסעדות", spent: 1200, budget: 1000, remaining: -200, percent: 120 }),
        cat({ id: "fuel", name: "דלק", spent: 200, budget: 800, remaining: 600, percent: 25 }),
      ], 1400),
      holdings: [],
      quotes: {},
    });
    expect(result.insightContext.budget).toBeDefined();
    expect(result.insightContext.budget!.overshootCategories).toHaveLength(1);
    expect(result.insightContext.budget!.overshootCategories[0].name).toBe("מסעדות");
    expect(result.insightContext.budget!.percent).toBe(78); // 1400/1800 = 77.7 -> 78
  });

  it("flags monthly deposit due today as critical", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [],
      quotes: {},
      monthlyDeposit: { amount: 2500, nextDate: NOW.toISOString().slice(0, 10) },
    });
    const a = result.alerts.find((x) => x.icon === "deposit");
    expect(a).toBeDefined();
    expect(a!.severity).toBe("critical");
    expect(a!.title).toContain("היום");
  });

  it("flags monthly deposit a few days away as info", () => {
    const next = new Date(NOW);
    next.setDate(next.getDate() + 2);
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [],
      quotes: {},
      monthlyDeposit: { amount: 2500, nextDate: next.toISOString().slice(0, 10) },
    });
    const a = result.alerts.find((x) => x.icon === "deposit");
    expect(a).toBeDefined();
    expect(a!.severity).toBe("info");
  });

  it("ignores monthly deposit more than 3 days away", () => {
    const next = new Date(NOW);
    next.setDate(next.getDate() + 10);
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: null,
      holdings: [],
      quotes: {},
      monthlyDeposit: { amount: 2500, nextDate: next.toISOString().slice(0, 10) },
    });
    expect(result.alerts.filter((a) => a.icon === "deposit")).toHaveLength(0);
  });

  it("sorts alerts by priority (critical first, larger overshoot first)", () => {
    const result = computeBriefing({
      now: NOW,
      goals: [],
      todayEvents: [],
      budget: budget([
        cat({ id: "a", name: "A", spent: 1100, budget: 1000, remaining: -100, percent: 110 }),
        cat({ id: "b", name: "B", spent: 1500, budget: 1000, remaining: -500, percent: 150 }),
        cat({ id: "c", name: "C", spent: 920, budget: 1000, remaining: 80, percent: 92 }),
      ]),
      holdings: [],
      quotes: {},
    });
    const ids = result.alerts.map((a) => a.id);
    // 150% > 110% > 92%
    expect(ids[0]).toBe("budget-over:b");
    expect(ids[1]).toBe("budget-over:a");
    expect(ids[2]).toBe("budget-warn:c");
  });
});
