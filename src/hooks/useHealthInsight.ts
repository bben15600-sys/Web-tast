import { useQuery } from "@tanstack/react-query";

export type HealthInsightContext = {
  date?: string;
  weekStats?: {
    workouts: number;
    totalMinutes: number;
    totalKcal: number;
    byType: Record<string, number>;
    workoutDelta: number;
    kcalDelta: number;
  };
  sleep?: {
    avgHours: number;
    delta: number;
    worstDayHours: number | null;
  };
  weight?: {
    current: number | null;
    goal: number | null;
    monthChange: number | null;
    direction: "down" | "up" | "flat" | null;
  };
};

export type UseHealthInsightResult = {
  insight: string | null;
  isLoading: boolean;
  error: string | null;
};

function contextSignature(ctx: HealthInsightContext): string {
  return JSON.stringify({
    date: ctx.date,
    workouts: ctx.weekStats?.workouts,
    avg: ctx.sleep?.avgHours,
    weight: ctx.weight?.current,
    delta: ctx.weight?.monthChange,
  });
}

export function useHealthInsight(context: HealthInsightContext): UseHealthInsightResult {
  const sig = contextSignature(context);
  const enabled = Boolean(
    context.weekStats?.workouts || context.sleep?.avgHours || context.weight?.current,
  );

  const query = useQuery<{ insight: string }>({
    queryKey: ["health-insight", sig],
    enabled,
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const r = await fetch("/api/health-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
        signal,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Health insight error (${r.status})`);
      return data;
    },
  });

  return {
    insight: query.data?.insight ?? null,
    isLoading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
