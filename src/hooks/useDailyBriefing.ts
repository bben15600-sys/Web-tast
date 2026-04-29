import { useMemo } from "react";
import { useTodayEvents } from "@/hooks/useTodayEvents";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useGoals } from "@/hooks/useGoals";
import { useInvestments } from "@/hooks/useInvestments";
import { useYahooQuotes } from "@/hooks/useYahooQuotes";
import { computeBriefing, type BriefingSummary } from "@/lib/dailyBriefing";

export type UseDailyBriefingResult = {
  briefing: BriefingSummary;
  isLoading: boolean;
  hasAnyData: boolean;
};

const DEPOSIT_KEY = "oslife.investments.monthlyDeposit.v1";

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function readMonthlyDeposit(): { amount: number; nextDate: string } | null {
  try {
    const raw = localStorage.getItem(DEPOSIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.amount === "number" && typeof parsed?.nextDate === "string") {
      return { amount: parsed.amount, nextDate: parsed.nextDate };
    }
  } catch { /* noop */ }
  return null;
}

export function useDailyBriefing(): UseDailyBriefingResult {
  const today = useTodayEvents();
  const week = useScheduleEvents();
  const budget = useBudgetData();
  const goals = useGoals();
  const investments = useInvestments();

  const symbols = useMemo(
    () =>
      investments.data?.holdings
        .map((h) => h.symbol)
        .filter((s): s is string => Boolean(s)) ?? [],
    [investments.data],
  );
  const { quotes } = useYahooQuotes(symbols);

  const briefing = useMemo(() => {
    const now = new Date();
    return computeBriefing({
      now,
      goals: goals.goals,
      todayEvents: today.events,
      weekEvents: week.data?.events,
      weekStart: startOfWeekSunday(now),
      budget: budget.data,
      holdings: investments.data?.holdings ?? [],
      quotes,
      monthlyDeposit: readMonthlyDeposit(),
    });
  }, [
    goals.goals,
    today.events,
    week.data,
    budget.data,
    investments.data,
    quotes,
  ]);

  const isLoading =
    today.loading ||
    week.isLoading ||
    budget.isLoading ||
    goals.loading ||
    investments.isLoading;

  const hasAnyData = Boolean(
    today.events.length ||
      goals.goals.length ||
      budget.data ||
      investments.data?.holdings.length,
  );

  return { briefing, isLoading, hasAnyData };
}
