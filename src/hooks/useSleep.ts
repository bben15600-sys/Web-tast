import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  createNotionPage,
  updateNotionPage,
  archiveNotionPage,
  extractDate,
  extractNumber,
  extractSelect,
  type NotionPage,
} from "@/lib/notion";

export type SleepQuality = "מצוין" | "טוב" | "בינוני" | "גרוע";

export type SleepEntry = {
  id: string;
  date: string;
  hours: number;
  quality: SleepQuality;
  source: "notion" | "sample";
};

const VALID_QUALITY: SleepQuality[] = ["מצוין", "טוב", "בינוני", "גרוע"];

function normalizeQuality(s: string | null): SleepQuality {
  if (s && (VALID_QUALITY as string[]).includes(s)) return s as SleepQuality;
  return "טוב";
}

function buildSample(): SleepEntry[] {
  const out: SleepEntry[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const samples: Array<{ offset: number; hours: number; quality: SleepQuality }> = [
    { offset: -6, hours: 7.5, quality: "טוב" },
    { offset: -5, hours: 6.2, quality: "בינוני" },
    { offset: -4, hours: 8.0, quality: "מצוין" },
    { offset: -3, hours: 6.8, quality: "טוב" },
    { offset: -2, hours: 5.5, quality: "גרוע" },
    { offset: -1, hours: 8.5, quality: "מצוין" },
    { offset: 0, hours: 7.2, quality: "טוב" },
  ];
  for (const s of samples) {
    const d = new Date(today);
    d.setDate(d.getDate() + s.offset);
    out.push({
      id: `sample-sleep-${s.offset}`,
      date: d.toISOString().slice(0, 10),
      hours: s.hours,
      quality: s.quality,
      source: "sample",
    });
  }
  return out;
}

const SAMPLE_SLEEP = buildSample();

function pageToSleep(page: NotionPage): SleepEntry | null {
  const dateProp = extractDate(page.properties["תאריך"] ?? page.properties["Date"]);
  if (!dateProp) return null;
  const hours = extractNumber(page.properties["שעות"] ?? page.properties["Hours"]) ?? 0;
  const quality = normalizeQuality(extractSelect(page.properties["איכות"] ?? page.properties["Quality"]));
  return {
    id: page.id,
    date: dateProp.start.slice(0, 10),
    hours,
    quality,
    source: "notion",
  };
}

export type UseSleepResult = {
  entries: SleepEntry[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
  isSample: boolean;
  databaseId: string | null;
  averageHours: number;
  addEntry: (input: Omit<SleepEntry, "id" | "source">) => Promise<void>;
  updateEntry: (id: string, input: Omit<SleepEntry, "id" | "source">) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  isMutating: boolean;
};

export function useSleep(daysBack = 14): UseSleepResult {
  const databaseId = import.meta.env.VITE_NOTION_SLEEP_DB_ID as string | undefined;
  const queryClient = useQueryClient();

  const sinceDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return d.toISOString().slice(0, 10);
  })();

  const query = useQuery<SleepEntry[]>({
    queryKey: ["notion", "sleep", databaseId ?? "sample", sinceDate],
    enabled: Boolean(databaseId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      if (!databaseId) return SAMPLE_SLEEP;
      const response = await queryNotionDatabase(
        {
          databaseId,
          page_size: 60,
          filter: { property: "תאריך", date: { on_or_after: sinceDate } },
          sorts: [{ property: "תאריך", direction: "ascending" }],
        },
        signal,
      );
      return response.results
        .map(pageToSleep)
        .filter((e): e is SleepEntry => e != null);
    },
  });

  const entries = !databaseId ? SAMPLE_SLEEP : query.data ?? [];
  const averageHours = entries.length > 0
    ? Math.round((entries.reduce((sum, e) => sum + e.hours, 0) / entries.length) * 10) / 10
    : 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notion", "sleep", databaseId] });

  const addMutation = useMutation({
    mutationFn: async (input: Omit<SleepEntry, "id" | "source">) => {
      if (!databaseId) throw new Error("Sleep database not configured");
      await createNotionPage({
        databaseId,
        properties: {
          "תאריך": { date: { start: input.date } },
          "שעות": { number: input.hours },
          "איכות": { select: { name: input.quality } },
        },
      });
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Omit<SleepEntry, "id" | "source"> }) => {
      if (id.startsWith("sample-")) return;
      await updateNotionPage({
        pageId: id,
        properties: {
          "תאריך": { date: { start: input.date } },
          "שעות": { number: input.hours },
          "איכות": { select: { name: input.quality } },
        },
      });
    },
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("sample-")) return;
      await archiveNotionPage({ pageId: id });
    },
    onSuccess: invalidate,
  });

  if (!databaseId) {
    return {
      entries: SAMPLE_SLEEP,
      loading: false,
      error: null,
      isConfigMissing: true,
      isSample: true,
      databaseId: null,
      averageHours,
      addEntry: async () => { /* no-op */ },
      updateEntry: async () => { /* no-op */ },
      removeEntry: async () => { /* no-op */ },
      isMutating: false,
    };
  }

  return {
    entries,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    isConfigMissing: false,
    isSample: false,
    databaseId,
    averageHours,
    addEntry: (input) => addMutation.mutateAsync(input),
    updateEntry: (id, input) => updateMutation.mutateAsync({ id, input }),
    removeEntry: (id) => removeMutation.mutateAsync(id),
    isMutating: addMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
}
