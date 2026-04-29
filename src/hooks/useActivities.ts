import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  createNotionPage,
  updateNotionPage,
  archiveNotionPage,
  extractDate,
  extractNumber,
  extractRichText,
  extractSelect,
  extractTitle,
  type NotionPage,
} from "@/lib/notion";

export type ActivityType =
  | "כדורסל"
  | "טניס"
  | "ריצה"
  | "כושר"
  | "אופניים"
  | "שחייה"
  | "אחר";

export type ActivityEntry = {
  id: string;
  date: string;
  type: ActivityType;
  title: string;
  durationMin: number;
  kcal: number;
  notes: string;
  source: "notion" | "sample" | "strava";
};

const VALID_TYPES: ActivityType[] = [
  "כדורסל",
  "טניס",
  "ריצה",
  "כושר",
  "אופניים",
  "שחייה",
  "אחר",
];

const SAMPLE: ActivityEntry[] = sampleActivities();

function sampleActivities(): ActivityEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: "s1", date: day(0), type: "כדורסל", title: "כדורסל", durationMin: 90, kcal: 620, notes: "מגרש הסוכנות", source: "sample" },
    { id: "s2", date: day(-1), type: "ריצה", title: "ריצה 6.2 ק\"מ", durationMin: 38, kcal: 410, notes: "פארק הירקון", source: "sample" },
    { id: "s3", date: day(-3), type: "טניס", title: "טניס", durationMin: 60, kcal: 480, notes: "מועדון רמת גן", source: "sample" },
    { id: "s4", date: day(-5), type: "כושר", title: "חדר כושר — כוח עליון", durationMin: 55, kcal: 380, notes: "", source: "sample" },
    { id: "s5", date: day(-6), type: "כדורסל", title: "כדורסל", durationMin: 75, kcal: 540, notes: "מגרש הסוכנות", source: "sample" },
  ];
}

function normalizeType(s: string | null): ActivityType {
  if (s && (VALID_TYPES as string[]).includes(s)) return s as ActivityType;
  return "אחר";
}

function pageToActivity(page: NotionPage): ActivityEntry | null {
  const title = extractTitle(page.properties["שם"] ?? page.properties["Name"]);
  const dateProp = extractDate(page.properties["תאריך"] ?? page.properties["Date"]);
  if (!dateProp) return null;
  const type = normalizeType(extractSelect(page.properties["סוג"] ?? page.properties["Type"]));
  const durationMin = extractNumber(page.properties["משך (דקות)"] ?? page.properties["Duration"]) ?? 0;
  const kcal = extractNumber(page.properties["קלוריות"] ?? page.properties["Calories"]) ?? 0;
  const notes = extractRichText(page.properties["הערות"] ?? page.properties["Notes"]) ?? "";
  return {
    id: page.id,
    date: dateProp.start.slice(0, 10),
    type,
    title: title || type,
    durationMin,
    kcal,
    notes,
    source: "notion",
  };
}

export type UseActivitiesResult = {
  activities: ActivityEntry[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
  isSample: boolean;
  databaseId: string | null;
  addActivity: (input: Omit<ActivityEntry, "id" | "source">) => Promise<void>;
  updateActivity: (id: string, input: Omit<ActivityEntry, "id" | "source">) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  isMutating: boolean;
};

export function useActivities(daysBack = 30): UseActivitiesResult {
  const databaseId = import.meta.env.VITE_NOTION_ACTIVITY_DB_ID as string | undefined;
  const queryClient = useQueryClient();

  const sinceDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return d.toISOString().slice(0, 10);
  })();

  const query = useQuery<ActivityEntry[]>({
    queryKey: ["notion", "activities", databaseId ?? "sample", sinceDate],
    enabled: Boolean(databaseId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      if (!databaseId) return SAMPLE;
      const response = await queryNotionDatabase(
        {
          databaseId,
          page_size: 100,
          filter: { property: "תאריך", date: { on_or_after: sinceDate } },
          sorts: [{ property: "תאריך", direction: "descending" }],
        },
        signal,
      );
      return response.results
        .map(pageToActivity)
        .filter((a): a is ActivityEntry => a != null);
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notion", "activities", databaseId] });

  const addMutation = useMutation({
    mutationFn: async (input: Omit<ActivityEntry, "id" | "source">) => {
      if (!databaseId) throw new Error("Activity database not configured");
      await createNotionPage({
        databaseId,
        properties: {
          "שם": { title: [{ text: { content: input.title } }] },
          "תאריך": { date: { start: input.date } },
          "סוג": { select: { name: input.type } },
          "משך (דקות)": { number: input.durationMin },
          "קלוריות": { number: input.kcal },
          "הערות": { rich_text: [{ text: { content: input.notes } }] },
        },
      });
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Omit<ActivityEntry, "id" | "source"> }) => {
      if (id.startsWith("s") && id.length <= 3) return;
      await updateNotionPage({
        pageId: id,
        properties: {
          "שם": { title: [{ text: { content: input.title } }] },
          "תאריך": { date: { start: input.date } },
          "סוג": { select: { name: input.type } },
          "משך (דקות)": { number: input.durationMin },
          "קלוריות": { number: input.kcal },
          "הערות": { rich_text: [{ text: { content: input.notes } }] },
        },
      });
    },
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("s") && id.length <= 3) return;
      await archiveNotionPage({ pageId: id });
    },
    onSuccess: invalidate,
  });

  if (!databaseId) {
    return {
      activities: SAMPLE,
      loading: false,
      error: null,
      isConfigMissing: true,
      isSample: true,
      databaseId: null,
      addActivity: async () => { /* no-op */ },
      updateActivity: async () => { /* no-op */ },
      removeActivity: async () => { /* no-op */ },
      isMutating: false,
    };
  }

  return {
    activities: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    isConfigMissing: false,
    isSample: false,
    databaseId,
    addActivity: (input) => addMutation.mutateAsync(input),
    updateActivity: (id, input) => updateMutation.mutateAsync({ id, input }),
    removeActivity: (id) => removeMutation.mutateAsync(id),
    isMutating: addMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
}
