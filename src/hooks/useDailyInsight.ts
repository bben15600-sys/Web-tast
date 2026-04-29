import { useQuery } from "@tanstack/react-query";
import type { InsightContext } from "@/lib/dailyBriefing";

type InsightResponse = {
  insight?: string;
  error?: string;
};

function isNonTrivial(ctx: InsightContext): boolean {
  if (ctx.todayEvents && ctx.todayEvents.length > 0) return true;
  if (ctx.budget) return true;
  if (ctx.market && ctx.market.holdings.length > 0) return true;
  if (ctx.goals && ctx.goals.length > 0) return true;
  if (ctx.upcomingBills && ctx.upcomingBills.length > 0) return true;
  return false;
}

function contextSignature(ctx: InsightContext): string {
  // Cache key — keys that materially affect the AI output. Excludes the
  // exact event titles so the same date with the same numbers doesn't
  // re-fetch when the user e.g. capitalises "Lihi" → "ליהי".
  return JSON.stringify({
    date: ctx.date,
    greetingPart: ctx.greetingPart,
    eventCount: ctx.todayEvents?.length ?? 0,
    budgetPercent: ctx.budget?.percent ?? null,
    overshoot: ctx.budget?.overshootCategories.length ?? 0,
    market: ctx.market?.holdings.map((h) => `${h.symbol}:${Math.round(h.changePct * 10) / 10}`) ?? [],
    goalsAtRisk: ctx.goals?.filter((g) => g.atRisk).length ?? 0,
    bills: ctx.upcomingBills?.length ?? 0,
  });
}

export type UseDailyInsightResult = {
  insight: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useDailyInsight(context: InsightContext): UseDailyInsightResult {
  const enabled = isNonTrivial(context);
  const signature = contextSignature(context);

  const query = useQuery<InsightResponse>({
    queryKey: ["daily-insight", signature],
    enabled,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/daily-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
        signal,
      });
      const data = (await response.json().catch(() => ({}))) as InsightResponse;
      if (!response.ok) {
        throw new Error(data.error || `Daily insight request failed (${response.status})`);
      }
      return data;
    },
  });

  return {
    insight: query.data?.insight ?? null,
    isLoading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
