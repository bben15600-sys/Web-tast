import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/dashboard/AppShell";
import { useActivities } from "@/hooks/useActivities";
import { useSleep } from "@/hooks/useSleep";
import { useWeight } from "@/hooks/useWeight";
import { useStrava } from "@/hooks/useStrava";
import { ActivityList } from "@/components/health/ActivityList";
import { SleepChart } from "@/components/health/SleepChart";
import { WeightTrend } from "@/components/health/WeightTrend";
import { HealthInsight } from "@/components/health/HealthInsight";
import { StravaConnect } from "@/components/health/StravaConnect";
import {
  computeWeekStats,
  compareWeeks,
  averageSleepLastWeek,
  computeWeightTrend,
} from "@/lib/healthStats";
import type { HealthInsightContext } from "@/hooks/useHealthInsight";

type HealthTab = "overview" | "activity" | "sleep" | "weight";

const Health = () => {
  const [tab, setTab] = useState<HealthTab>("overview");
  const activities = useActivities();
  const sleep = useSleep();
  const weight = useWeight();
  const strava = useStrava();

  // Show Strava connection feedback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("strava_connected") === "1") {
      strava.refetch();
      params.delete("strava_connected");
      const newSearch = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${newSearch ? "?" + newSearch : ""}`);
    }
  }, [strava]);

  const insightContext = useMemo<HealthInsightContext>(() => {
    const wk = compareWeeks(activities.activities);
    const slp = averageSleepLastWeek(sleep.entries);
    const trend = computeWeightTrend(weight.entries, weight.goal);
    return {
      date: new Date().toISOString().slice(0, 10),
      weekStats: {
        workouts: wk.current.workouts,
        totalMinutes: wk.current.totalMinutes,
        totalKcal: wk.current.totalKcal,
        byType: wk.current.byType,
        workoutDelta: wk.workoutDelta,
        kcalDelta: wk.kcalDelta,
      },
      sleep: {
        avgHours: slp.avgHours,
        delta: slp.delta,
        worstDayHours: slp.worstDay?.hours ?? null,
      },
      weight: {
        current: trend.current,
        goal: trend.goal,
        monthChange: trend.monthChange,
        direction: trend.direction,
      },
    };
  }, [activities.activities, sleep.entries, weight.entries, weight.goal]);

  const wkStats = useMemo(() => computeWeekStats(activities.activities), [activities.activities]);
  const sleepStats = useMemo(() => averageSleepLastWeek(sleep.entries), [sleep.entries]);
  const weightTrend = useMemo(() => computeWeightTrend(weight.entries, weight.goal), [weight.entries, weight.goal]);

  return (
    <AppShell>
      <h1 className="sr-only">הבריאות שלי</h1>

      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3" style={{ padding: "4px 4px 2px" }}>
          <div className="flex items-center justify-between">
            <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--oslife-text-strong)", letterSpacing: "-0.02em" }}>
              הבריאות שלי
            </h1>
            {strava.connected && (
              <span style={stravaBadgeStyle}>🚴 Strava</span>
            )}
          </div>

          <nav className="kitchen-tabs">
            {[
              { key: "overview" as HealthTab, label: "סקירה", icon: "📊" },
              { key: "activity" as HealthTab, label: "פעילות", icon: "🏃" },
              { key: "sleep" as HealthTab, label: "שינה", icon: "😴" },
              { key: "weight" as HealthTab, label: "משקל", icon: "⚖️" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`kitchen-tab ${tab === t.key ? "is-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </header>

        {tab === "overview" && (
          <>
            <HeroStats
              workouts={wkStats.workouts}
              workoutDelta={wkStats.workouts - compareWeeks(activities.activities).previous.workouts}
              avgSleep={sleepStats.avgHours}
              sleepDelta={sleepStats.delta}
              currentWeight={weightTrend.current}
              monthChange={weightTrend.monthChange}
              totalKcal={wkStats.totalKcal}
              kcalDelta={compareWeeks(activities.activities).kcalDelta}
            />

            <div style={twoColStyle}>
              <ActivityList />
              <SleepChart />
            </div>

            <div style={twoColStyle}>
              <WeightTrend />
              <section className="glass" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                  <h3 className="card-title">סיכום שבועי</h3>
                  <span className="label-cap">{wkStats.weekStart} – {wkStats.weekEnd}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", padding: "8px 0" }}>
                  <SummaryStat value={String(wkStats.workouts)} label="אימונים" color="#34D399" />
                  <SummaryStat value={`${Math.floor(wkStats.totalMinutes / 60)}:${String(wkStats.totalMinutes % 60).padStart(2, "0")}`} label="שעות פעילות" color="#FB923C" />
                  <SummaryStat value={wkStats.totalKcal.toLocaleString()} label="קלוריות" color="#FB7185" />
                </div>
                <StravaConnect />
              </section>
            </div>

            <HealthInsight context={insightContext} />
          </>
        )}

        {tab === "activity" && <ActivityList />}
        {tab === "sleep" && <SleepChart />}
        {tab === "weight" && <WeightTrend />}
      </div>
    </AppShell>
  );
};

function HeroStats({
  workouts,
  workoutDelta,
  avgSleep,
  sleepDelta,
  currentWeight,
  monthChange,
  totalKcal,
  kcalDelta,
}: {
  workouts: number;
  workoutDelta: number;
  avgSleep: number;
  sleepDelta: number;
  currentWeight: number | null;
  monthChange: number | null;
  totalKcal: number;
  kcalDelta: number;
}) {
  return (
    <div style={heroGridStyle}>
      <HeroCard
        icon="🏋️"
        value={String(workouts)}
        label="אימונים השבוע"
        delta={workoutDelta !== 0 ? `${workoutDelta > 0 ? "↑ +" : "↓ "}${Math.abs(workoutDelta)} משבוע שעבר` : null}
        deltaColor={workoutDelta >= 0 ? "#34D399" : "#FB7185"}
        accent="#34D399"
      />
      <HeroCard
        icon="😴"
        value={avgSleep > 0 ? avgSleep.toFixed(1) : "—"}
        label="ממוצע שעות שינה"
        delta={sleepDelta !== 0 ? `${sleepDelta > 0 ? "↑ +" : "↓ "}${Math.abs(sleepDelta).toFixed(1)} מהשבוע שעבר` : null}
        deltaColor={sleepDelta >= 0 ? "#34D399" : "#FB7185"}
        accent="#A78BFA"
      />
      <HeroCard
        icon="⚖️"
        value={currentWeight != null ? currentWeight.toFixed(1) : "—"}
        label="משקל (ק״ג)"
        delta={monthChange != null && monthChange !== 0 ? `${monthChange > 0 ? "↑ +" : "↓ "}${Math.abs(monthChange).toFixed(1)} מהחודש` : null}
        deltaColor={monthChange != null && monthChange < 0 ? "#34D399" : "#FB7185"}
        accent="#60A5FA"
      />
      <HeroCard
        icon="🔥"
        value={totalKcal.toLocaleString()}
        label="קלוריות שנשרפו"
        delta={kcalDelta !== 0 ? `${kcalDelta > 0 ? "↑ +" : "↓ "}${Math.abs(kcalDelta).toLocaleString()} מהשבוע` : null}
        deltaColor={kcalDelta >= 0 ? "#34D399" : "#FB7185"}
        accent="#FB923C"
      />
    </div>
  );
}

function HeroCard({
  icon,
  value,
  label,
  delta,
  deltaColor,
  accent,
}: {
  icon: string;
  value: string;
  label: string;
  delta: string | null;
  deltaColor: string;
  accent: string;
}) {
  return (
    <div style={{
      background: `${accent}0A`,
      border: `1px solid ${accent}33`,
      borderRadius: 14,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>{label}</div>
      {delta && (
        <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: deltaColor }}>{delta}</div>
      )}
    </div>
  );
}

function SummaryStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--oslife-text-mute)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const heroGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};
const stravaBadgeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 14px",
  borderRadius: 10,
  background: "rgba(252,76,2,0.12)",
  border: "1px solid rgba(252,76,2,0.3)",
  color: "#FC4C02",
  fontSize: 12,
  fontWeight: 700,
};

export default Health;
