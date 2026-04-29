import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  createNotionPage,
  archiveNotionPage,
  extractDate,
  extractRelation,
  extractRichText,
  extractSelect,
  type NotionPage,
} from "@/lib/notion";

export type MealSlot = "בוקר" | "צהריים" | "ערב" | "נשנוש";

export type MealPlanEntry = {
  id: string;
  date: string;
  slot: MealSlot;
  recipeId: string | null;
  recipeName: string | null;
  notes: string;
  source: "notion" | "sample";
};

export type UseMealPlanResult = {
  entries: MealPlanEntry[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
  isSample: boolean;
  databaseId: string | null;
  addEntry: (input: { date: string; slot: MealSlot; recipeId?: string; recipeName?: string; notes?: string }) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
  isMutating: boolean;
};

const SLOT_VALUES: MealSlot[] = ["בוקר", "צהריים", "ערב", "נשנוש"];

function isMealSlot(s: string | null): s is MealSlot {
  return s != null && (SLOT_VALUES as string[]).includes(s);
}

function pageToEntry(page: NotionPage): MealPlanEntry | null {
  const dateProp = extractDate(page.properties["תאריך"] ?? page.properties["Date"]);
  if (!dateProp) return null;
  const slotRaw = extractSelect(page.properties["ארוחה"] ?? page.properties["Meal"]);
  const slot: MealSlot = isMealSlot(slotRaw) ? slotRaw : "ערב";
  const relations = extractRelation(page.properties["מתכון"] ?? page.properties["Recipe"]);
  const notes = extractRichText(page.properties["הערות"] ?? page.properties["Notes"]) ?? "";
  return {
    id: page.id,
    date: dateProp.start.slice(0, 10),
    slot,
    recipeId: relations[0] ?? null,
    recipeName: null,
    notes,
    source: "notion",
  };
}

function buildSampleEntries(weekStart: Date): MealPlanEntry[] {
  const out: MealPlanEntry[] = [];
  const samples: Array<{ dayOffset: number; slot: MealSlot; name: string }> = [
    { dayOffset: 0, slot: "בוקר", name: "שיבולת שועל + בננה" },
    { dayOffset: 0, slot: "צהריים", name: "סלט טונה" },
    { dayOffset: 0, slot: "ערב", name: "פסטה ברוטב עגבניות" },
    { dayOffset: 1, slot: "בוקר", name: "ביצים + ירקות" },
    { dayOffset: 1, slot: "ערב", name: "חזה עוף + אורז" },
    { dayOffset: 2, slot: "בוקר", name: "יוגורט + גרנולה" },
    { dayOffset: 2, slot: "צהריים", name: "סנדוויץ׳ גבינה" },
    { dayOffset: 3, slot: "צהריים", name: "מרק עדשים" },
    { dayOffset: 3, slot: "ערב", name: "שניצל + תפו״א" },
  ];
  for (const s of samples) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + s.dayOffset);
    out.push({
      id: `sample-${s.dayOffset}-${s.slot}`,
      date: d.toISOString().slice(0, 10),
      slot: s.slot,
      recipeId: null,
      recipeName: s.name,
      notes: "",
      source: "sample",
    });
  }
  return out;
}

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useMealPlan(weekStart?: Date): UseMealPlanResult {
  const databaseId = import.meta.env.VITE_NOTION_MEALPLAN_DB_ID as string | undefined;
  const queryClient = useQueryClient();
  const start = weekStart ?? startOfWeekSunday(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const startKey = isoDate(start);
  const endKey = isoDate(end);

  const query = useQuery<MealPlanEntry[]>({
    queryKey: ["notion", "mealplan", databaseId ?? "sample", startKey],
    enabled: Boolean(databaseId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      if (!databaseId) return buildSampleEntries(start);
      const response = await queryNotionDatabase(
        {
          databaseId,
          page_size: 100,
          filter: {
            and: [
              { property: "תאריך", date: { on_or_after: startKey } },
              { property: "תאריך", date: { before: endKey } },
            ],
          },
        },
        signal,
      );
      return response.results
        .map(pageToEntry)
        .filter((e): e is MealPlanEntry => e != null);
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notion", "mealplan", databaseId, startKey] });

  const addMutation = useMutation({
    mutationFn: async (input: { date: string; slot: MealSlot; recipeId?: string; recipeName?: string; notes?: string }) => {
      if (!databaseId) throw new Error("Meal plan database not configured");
      const properties: Record<string, unknown> = {
        "תאריך": { date: { start: input.date } },
        "ארוחה": { select: { name: input.slot } },
      };
      if (input.recipeId) {
        properties["מתכון"] = { relation: [{ id: input.recipeId }] };
      }
      if (input.notes) {
        properties["הערות"] = { rich_text: [{ text: { content: input.notes } }] };
      }
      await createNotionPage({ databaseId, properties });
    },
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      if (entryId.startsWith("sample-")) return;
      await archiveNotionPage({ pageId: entryId });
    },
    onSuccess: invalidate,
  });

  if (!databaseId) {
    return {
      entries: buildSampleEntries(start),
      loading: false,
      error: null,
      isConfigMissing: true,
      isSample: true,
      databaseId: null,
      addEntry: async () => { /* no-op in sample mode */ },
      removeEntry: async () => { /* no-op */ },
      isMutating: false,
    };
  }

  return {
    entries: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    isConfigMissing: false,
    isSample: false,
    databaseId,
    addEntry: (input) => addMutation.mutateAsync(input),
    removeEntry: (id) => removeMutation.mutateAsync(id),
    isMutating: addMutation.isPending || removeMutation.isPending,
  };
}
