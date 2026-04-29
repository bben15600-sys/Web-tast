import type { ActivityEntry } from "@/hooks/useActivities";
import type { SleepEntry } from "@/hooks/useSleep";
import type { WeightEntry } from "@/hooks/useWeight";

export type WeekStats = {
  weekStart: string;
  weekEnd: string;
  workouts: number;
  totalMinutes: number;
  totalKcal: number;
  byType: Record<string, number>;
};

export type WeightTrend = {
  current: number | null;
  goal: number | null;
  remaining: number | null;
  monthChange: number | null;
  direction: "down" | "up" | "flat" | null;
};

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeWeekStats(activities: ActivityEntry[], referenceDate: Date = new Date()): WeekStats {
  const weekStart = startOfWeekSunday(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const startKey = isoDate(weekStart);
  const endKey = isoDate(weekEnd);

  let workouts = 0;
  let totalMinutes = 0;
  let totalKcal = 0;
  const byType: Record<string, number> = {};

  for (const a of activities) {
    if (a.date < startKey || a.date >= endKey) continue;
    workouts++;
    totalMinutes += a.durationMin;
    totalKcal += a.kcal;
    byType[a.type] = (byType[a.type] ?? 0) + 1;
  }

  return {
    weekStart: startKey,
    weekEnd: isoDate(new Date(weekEnd.getTime() - 86400000)),
    workouts,
    totalMinutes,
    totalKcal,
    byType,
  };
}

export function compareWeeks(activities: ActivityEntry[], referenceDate: Date = new Date()): {
  current: WeekStats;
  previous: WeekStats;
  workoutDelta: number;
  kcalDelta: number;
} {
  const lastWeekRef = new Date(referenceDate);
  lastWeekRef.setDate(lastWeekRef.getDate() - 7);
  const current = computeWeekStats(activities, referenceDate);
  const previous = computeWeekStats(activities, lastWeekRef);
  return {
    current,
    previous,
    workoutDelta: current.workouts - previous.workouts,
    kcalDelta: current.totalKcal - previous.totalKcal,
  };
}

export function averageSleepLastWeek(entries: SleepEntry[], referenceDate: Date = new Date()): {
  avgHours: number;
  prevAvgHours: number;
  delta: number;
  worstDay: SleepEntry | null;
} {
  const weekStart = startOfWeekSunday(referenceDate);
  const startKey = isoDate(weekStart);
  const endKey = isoDate(new Date(weekStart.getTime() + 7 * 86400000));
  const prevStart = isoDate(new Date(weekStart.getTime() - 7 * 86400000));

  const thisWeek = entries.filter((e) => e.date >= startKey && e.date < endKey);
  const prevWeek = entries.filter((e) => e.date >= prevStart && e.date < startKey);

  const avgHours = thisWeek.length > 0
    ? Math.round((thisWeek.reduce((sum, e) => sum + e.hours, 0) / thisWeek.length) * 10) / 10
    : 0;
  const prevAvgHours = prevWeek.length > 0
    ? Math.round((prevWeek.reduce((sum, e) => sum + e.hours, 0) / prevWeek.length) * 10) / 10
    : 0;

  let worst: SleepEntry | null = null;
  for (const e of thisWeek) {
    if (!worst || e.hours < worst.hours) worst = e;
  }

  return {
    avgHours,
    prevAvgHours,
    delta: Math.round((avgHours - prevAvgHours) * 10) / 10,
    worstDay: worst,
  };
}

export function computeWeightTrend(entries: WeightEntry[], goal: number | null): WeightTrend {
  if (entries.length === 0) {
    return { current: null, goal, remaining: null, monthChange: null, direction: null };
  }
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted[sorted.length - 1].kg;
  const oldest = sorted[0].kg;
  const change = Math.round((current - oldest) * 10) / 10;
  const direction: WeightTrend["direction"] =
    Math.abs(change) < 0.2 ? "flat" : change < 0 ? "down" : "up";
  return {
    current,
    goal,
    remaining: goal != null ? Math.round((current - goal) * 10) / 10 : null,
    monthChange: change,
    direction,
  };
}

export function projectGoalEta(trend: WeightTrend, daysSpan: number): {
  weeksToGoal: number | null;
  reachable: boolean;
} {
  if (trend.current == null || trend.goal == null || trend.monthChange == null) {
    return { weeksToGoal: null, reachable: false };
  }
  const remaining = trend.current - trend.goal;
  if (Math.abs(remaining) < 0.1) return { weeksToGoal: 0, reachable: true };
  if (trend.monthChange === 0) return { weeksToGoal: null, reachable: false };
  const ratePerDay = trend.monthChange / daysSpan;
  if (Math.sign(ratePerDay) === Math.sign(remaining)) {
    return { weeksToGoal: null, reachable: false };
  }
  const days = Math.abs(remaining / ratePerDay);
  return { weeksToGoal: Math.ceil(days / 7), reachable: true };
}
