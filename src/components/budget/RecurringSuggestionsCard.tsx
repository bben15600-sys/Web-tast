import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNotionPage } from "@/lib/notion";
import {
  useBudgetData,
  type BudgetCategory,
  type BudgetTransaction,
} from "@/hooks/useBudgetData";

type Suggestion = {
  id: string;
  name: string;
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  paymentMethod: string | null;
  expectedDay: number | null; // day-of-month hint from the prior entry
  sourceDate: Date;
};

function dayOfMonth(d: Date): number {
  return d.getDate();
}

function buildSuggestedDate(reference: Date, day: number | null): string {
  const target = new Date(reference);
  target.setDate(1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const wanted = day == null || day <= 0 ? reference.getDate() : Math.min(day, lastDay);
  target.setDate(wanted);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function RecurringSuggestionsCard({
  monthOffset,
  currentTransactions,
  reference,
  categories,
}: {
  monthOffset: number;
  currentTransactions: BudgetTransaction[];
  reference: Date;
  categories: BudgetCategory[];
}) {
  // Only show on the current month — past/future don't need "missing" hints.
  const enabled = monthOffset === 0;
  const prior = useBudgetData({ monthOffset: -1, enabled });

  const qc = useQueryClient();
  const expensesDbId = import.meta.env.VITE_NOTION_EXPENSES_DB_ID as string | undefined;
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!enabled || !prior.data) return [];
    const priorRecurring = prior.data.transactions.filter(
      (t) => t.type === "expense" && t.frequency === "קבועה",
    );
    const currentNames = new Set(
      currentTransactions
        .filter((t) => t.type === "expense")
        .map((t) => normalize(t.name)),
    );
    const seen = new Set<string>();
    const out: Suggestion[] = [];
    for (const t of priorRecurring) {
      const key = normalize(t.name);
      if (!key || seen.has(key) || currentNames.has(key)) continue;
      seen.add(key);
      out.push({
        id: t.id,
        name: t.name,
        amount: t.amount,
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        categoryEmoji: t.categoryEmoji,
        paymentMethod: t.paymentMethod,
        expectedDay: dayOfMonth(t.date),
        sourceDate: t.date,
      });
    }
    return out.sort((a, b) => (a.expectedDay ?? 31) - (b.expectedDay ?? 31));
  }, [enabled, prior.data, currentTransactions]);

  const addMutation = useMutation({
    mutationFn: async (s: Suggestion) => {
      if (!expensesDbId) throw new Error("חסר VITE_NOTION_EXPENSES_DB_ID");
      const properties: Record<string, unknown> = {
        "שם": { title: [{ text: { content: s.name } }] },
        "סכום": { number: s.amount },
        "תאריך": { date: { start: buildSuggestedDate(reference, s.expectedDay) } },
        "תדירות": { select: { name: "קבועה" } },
      };
      if (s.categoryId) properties["קטגוריה"] = { relation: [{ id: s.categoryId }] };
      if (s.paymentMethod) properties["אמצעי תשלום"] = { select: { name: s.paymentMethod } };
      return createNotionPage({
        integration: "mm",
        databaseId: expensesDbId,
        properties,
      });
    },
    onSuccess: (_data, s) => {
      setAdded((prev) => new Set(prev).add(s.id));
      qc.invalidateQueries({ queryKey: ["mm"] });
    },
  });

  void categories;
  if (!enabled || dismissed) return null;
  if (prior.isLoading) return null;
  if (suggestions.length === 0) return null;

  const remaining = suggestions.filter((s) => !added.has(s.id));
  if (remaining.length === 0) return null;

  return (
    <section className="glass" style={{ ["--i" as string]: 1.5 } as React.CSSProperties}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div className="flex flex-col">
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#A78BFA" }}>
            קבועות צפויות · טרם נרשמו החודש
          </h2>
          <span style={{ fontSize: 11, color: "#6B7094" }}>
            מבוסס על קבועות מחודש שעבר ({prior.data?.monthLabel ?? ""}) שטרם הופיעו בחודש הנוכחי
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            padding: "4px 10px",
            fontSize: 10,
            color: "#6B7094",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          הסתר
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {remaining.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3"
            style={{
              padding: "10px 12px",
              background: "rgba(10,12,28,0.55)",
              border: "1px solid rgba(167,139,250,0.18)",
              borderRadius: 10,
            }}
          >
            <div className="flex flex-col flex-1 min-w-0">
              <span style={{ fontSize: 13, color: "#F5F6FF", fontWeight: 600 }}>{s.name}</span>
              <span style={{ fontSize: 11, color: "#B4B8D4" }}>
                {s.categoryEmoji ? `${s.categoryEmoji} ` : ""}{s.categoryName ?? "לא שובץ"}
                {s.expectedDay ? ` · ${s.expectedDay}.${String(reference.getMonth() + 1).padStart(2, "0")}` : ""}
                {s.paymentMethod ? ` · ${s.paymentMethod}` : ""}
              </span>
            </div>
            <span className="mono currency" style={{ fontSize: 13, fontWeight: 700, color: "#F5F6FF", minWidth: 80, textAlign: "end" }}>
              ₪{Math.round(s.amount).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => addMutation.mutate(s)}
              disabled={addMutation.isPending}
              aria-label="הוסף"
              style={{
                width: 34,
                height: 30,
                borderRadius: 8,
                background: "rgba(52,211,153,0.14)",
                border: "1px solid rgba(52,211,153,0.30)",
                color: "#34D399",
                cursor: addMutation.isPending ? "default" : "pointer",
                fontFamily: "inherit",
                fontSize: 16,
                fontWeight: 700,
                opacity: addMutation.isPending ? 0.5 : 1,
              }}
            >
              +
            </button>
          </div>
        ))}
      </div>

      {addMutation.error && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#FB7185",
            background: "rgba(251,113,133,0.10)",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(251,113,133,0.24)",
          }}
        >
          ⚠️ {addMutation.error instanceof Error ? addMutation.error.message : "שגיאה"}
        </div>
      )}
    </section>
  );
}
