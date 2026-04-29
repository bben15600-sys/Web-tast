import { useMemo } from "react";
import { useBudgetData, type BudgetData } from "@/hooks/useBudgetData";

export type MonthSnapshot = {
  /** 0 = this month, -1 = last month, ... */
  offset: number;
  label: string;
  income: number;
  expense: number;
  savings: number;
  net: number;
  isLoading: boolean;
  error: string | null;
};

/**
 * Pulls the last N months of budget totals from Notion.
 *
 * Each offset gets its own React Query entry, so the cache deduplicates
 * across pages (this hook + the regular Budget view will share entries
 * for the current month).
 */
export function useMonthlyHistory(months: number = 6): {
  snapshots: MonthSnapshot[];
  isLoading: boolean;
  error: string | null;
} {
  // React's rules-of-hooks require a fixed number of hook calls per
  // render. We unroll up to 12 month offsets; if `months` is smaller,
  // the extra calls are cheap — they just skip fetching via enabled.
  //
  // 12 is the hard cap; asking for more will throw in dev so we don't
  // silently truncate.
  if (months > 12) throw new Error("useMonthlyHistory supports up to 12 months");

  const results = [
    useBudgetData({ monthOffset:  0, enabled: months >  0 }),
    useBudgetData({ monthOffset: -1, enabled: months >  1 }),
    useBudgetData({ monthOffset: -2, enabled: months >  2 }),
    useBudgetData({ monthOffset: -3, enabled: months >  3 }),
    useBudgetData({ monthOffset: -4, enabled: months >  4 }),
    useBudgetData({ monthOffset: -5, enabled: months >  5 }),
    useBudgetData({ monthOffset: -6, enabled: months >  6 }),
    useBudgetData({ monthOffset: -7, enabled: months >  7 }),
    useBudgetData({ monthOffset: -8, enabled: months >  8 }),
    useBudgetData({ monthOffset: -9, enabled: months >  9 }),
    useBudgetData({ monthOffset: -10, enabled: months > 10 }),
    useBudgetData({ monthOffset: -11, enabled: months > 11 }),
  ];

  return useMemo(() => {
    const snapshots: MonthSnapshot[] = [];
    let anyLoading = false;
    let firstError: string | null = null;
    for (let i = 0; i < months; i++) {
      const r = results[i];
      const offset = -i;
      if (r.isLoading) anyLoading = true;
      if (r.error && !firstError) firstError = r.error;
      const data = r.data as BudgetData | null;
      snapshots.push({
        offset,
        label: data?.monthLabel ?? monthLabelFor(r.reference),
        income: data?.totals.income ?? 0,
        expense: data?.totals.expense ?? 0,
        savings: data?.totals.savings ?? 0,
        net: data?.totals.net ?? 0,
        isLoading: r.isLoading,
        error: r.error,
      });
    }
    // Order oldest → newest, which is the natural left-to-right for a chart.
    snapshots.reverse();
    return { snapshots, isLoading: anyLoading, error: firstError };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    months,
    // Spread each data/isLoading/error so useMemo fires when any month resolves.
    ...results.flatMap((r) => [r.data, r.isLoading, r.error]),
  ]);
}

const HEBREW_MONTHS_SHORT = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יונ׳",
  "יול׳", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

function monthLabelFor(date: Date): string {
  return `${HEBREW_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}
