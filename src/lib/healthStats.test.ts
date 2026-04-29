import { describe, it, expect } from "vitest";
import {
  computeWeekStats,
  compareWeeks,
  averageSleepLastWeek,
  computeWeightTrend,
  projectGoalEta,
} from "./healthStats";
import type { ActivityEntry } from "@/hooks/useActivities";
import type { SleepEntry } from "@/hooks/useSleep";
import type { WeightEntry } from "@/hooks/useWeight";

// Reference: Saturday 2026-04-25 (week starts Sunday 2026-04-19)
const NOW = new Date("2026-04-25T10:00:00");

function activity(over: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: "a1",
    date: "2026-04-22",
    type: "כדורסל",
    title: "כדורסל",
    durationMin: 60,
    kcal: 500,
    notes: "",
    source: "sample",
    ...over,
  };
}

function sleepRow(date: string, hours: number): SleepEntry {
  return { id: `s-${date}`, date, hours, quality: "טוב", source: "sample" };
}

function weightRow(date: string, kg: number): WeightEntry {
  return { id: `w-${date}`, date, kg, source: "sample" };
}

describe("computeWeekStats", () => {
  it("returns zeros for empty input", () => {
    const s = computeWeekStats([], NOW);
    expect(s.workouts).toBe(0);
    expect(s.totalMinutes).toBe(0);
    expect(s.totalKcal).toBe(0);
    expect(s.weekStart).toBe("2026-04-19");
  });

  it("aggregates only activities within the week", () => {
    const acts = [
      activity({ date: "2026-04-19" }),
      activity({ date: "2026-04-22", durationMin: 90, kcal: 700, type: "ריצה" }),
      activity({ date: "2026-04-12", durationMin: 100, kcal: 1000 }), // last week — excluded
    ];
    const s = computeWeekStats(acts, NOW);
    expect(s.workouts).toBe(2);
    expect(s.totalMinutes).toBe(150);
    expect(s.totalKcal).toBe(1200);
    expect(s.byType["כדורסל"]).toBe(1);
    expect(s.byType["ריצה"]).toBe(1);
  });

  it("excludes activities at the exact next-week boundary", () => {
    const s = computeWeekStats(
      [activity({ date: "2026-04-26" })], // next Sunday
      NOW,
    );
    expect(s.workouts).toBe(0);
  });
});

describe("compareWeeks", () => {
  it("computes deltas relative to the previous week", () => {
    const acts = [
      activity({ id: "1", date: "2026-04-22", kcal: 500 }),
      activity({ id: "2", date: "2026-04-23", kcal: 600 }),
      activity({ id: "3", date: "2026-04-15", kcal: 400 }),
    ];
    const r = compareWeeks(acts, NOW);
    expect(r.current.workouts).toBe(2);
    expect(r.previous.workouts).toBe(1);
    expect(r.workoutDelta).toBe(1);
    expect(r.kcalDelta).toBe(700); // 1100 - 400
  });
});

describe("averageSleepLastWeek", () => {
  it("computes average hours and identifies worst day", () => {
    const r = averageSleepLastWeek([
      sleepRow("2026-04-19", 7.5),
      sleepRow("2026-04-20", 6.0),
      sleepRow("2026-04-21", 8.0),
      sleepRow("2026-04-22", 5.5), // worst
      sleepRow("2026-04-23", 7.0),
    ], NOW);
    expect(r.avgHours).toBe(6.8); // (7.5+6+8+5.5+7)/5 = 34/5 = 6.8
    expect(r.worstDay?.hours).toBe(5.5);
  });

  it("returns 0 average and null worst day for empty data", () => {
    const r = averageSleepLastWeek([], NOW);
    expect(r.avgHours).toBe(0);
    expect(r.worstDay).toBeNull();
  });

  it("delta against previous week", () => {
    const r = averageSleepLastWeek([
      sleepRow("2026-04-12", 6.0),
      sleepRow("2026-04-19", 7.0),
      sleepRow("2026-04-20", 7.0),
    ], NOW);
    expect(r.avgHours).toBe(7.0);
    expect(r.prevAvgHours).toBe(6.0);
    expect(r.delta).toBe(1.0);
  });
});

describe("computeWeightTrend", () => {
  it("returns nulls for empty data", () => {
    const t = computeWeightTrend([], 76);
    expect(t.current).toBeNull();
    expect(t.direction).toBeNull();
  });

  it("identifies a downward trend", () => {
    const t = computeWeightTrend([
      weightRow("2026-03-25", 80),
      weightRow("2026-04-25", 78),
    ], 76);
    expect(t.current).toBe(78);
    expect(t.monthChange).toBe(-2);
    expect(t.direction).toBe("down");
    expect(t.remaining).toBe(2);
  });

  it("identifies a flat trend within tolerance", () => {
    const t = computeWeightTrend([
      weightRow("2026-03-25", 78),
      weightRow("2026-04-25", 78.1),
    ], null);
    expect(t.direction).toBe("flat");
    expect(t.remaining).toBeNull();
  });
});

describe("projectGoalEta", () => {
  it("estimates weeks to goal at current rate", () => {
    const trend = { current: 78, goal: 76, remaining: 2, monthChange: -1, direction: "down" as const };
    // -1 kg per 30 days = -0.033/day, need to lose 2 kg → 60 days → 9 weeks
    const eta = projectGoalEta(trend, 30);
    expect(eta.weeksToGoal).toBe(9);
    expect(eta.reachable).toBe(true);
  });

  it("returns unreachable when trend goes wrong direction", () => {
    const trend = { current: 78, goal: 76, remaining: 2, monthChange: 1, direction: "up" as const };
    const eta = projectGoalEta(trend, 30);
    expect(eta.reachable).toBe(false);
    expect(eta.weeksToGoal).toBeNull();
  });

  it("returns 0 weeks when already at goal", () => {
    const trend = { current: 76, goal: 76, remaining: 0, monthChange: -1, direction: "down" as const };
    const eta = projectGoalEta(trend, 30);
    expect(eta.weeksToGoal).toBe(0);
    expect(eta.reachable).toBe(true);
  });
});
