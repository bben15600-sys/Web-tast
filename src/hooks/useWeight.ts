import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  createNotionPage,
  updateNotionPage,
  archiveNotionPage,
  extractDate,
  extractNumber,
  type NotionPage,
} from "@/lib/notion";

export type WeightEntry = {
  id: string;
  date: string;
  kg: number;
  source: "notion" | "sample";
};

function buildSample(): WeightEntry[] {
  const out: WeightEntry[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = 80.0;
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const noise = (Math.sin(i * 0.7) * 0.3);
    const trend = -((30 - i) * 0.05);
    out.push({
      id: `sample-w-${i}`,
      date: d.toISOString().slice(0, 10),
      kg: Math.round((start + trend + noise) * 10) / 10,
      source: "sample",
    });
  }
  return out;
}

const SAMPLE_WEIGHT = buildSample();

function pageToWeight(page: NotionPage): WeightEntry | null {
  const dateProp = extractDate(page.properties["תאריך"] ?? page.properties["Date"]);
  if (!dateProp) return null;
  const kg = extractNumber(page.properties["משקל"] ?? page.properties["Weight"]);
  if (kg == null) return null;
  return { id: page.id, date: dateProp.start.slice(0, 10), kg, source: "notion" };
}

export type UseWeightResult = {
  entries: WeightEntry[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
  isSample: boolean;
  databaseId: string | null;
  current: number | null;
  earliest: number | null;
  goal: number | null;
  addEntry: (input: { date: string; kg: number }) => Promise<void>;
  updateEntry: (id: string, input: { date: string; kg: number }) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  isMutating: boolean;
};

const GOAL_KG_KEY = "oslife.health.weightGoal.v1";

function readGoal(): number | null {
  try {
    const raw = localStorage.getItem(GOAL_KG_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function useWeight(daysBack = 90): UseWeightResult {
  const databaseId = import.meta.env.VITE_NOTION_WEIGHT_DB_ID as string | undefined;
  const queryClient = useQueryClient();

  const sinceDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return d.toISOString().slice(0, 10);
  })();

  const query = useQuery<WeightEntry[]>({
    queryKey: ["notion", "weight", databaseId ?? "sample", sinceDate],
    enabled: Boolean(databaseId),
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!databaseId) return SAMPLE_WEIGHT;
      const response = await queryNotionDatabase(
        {
          databaseId,
          page_size: 100,
          filter: { property: "תאריך", date: { on_or_after: sinceDate } },
          sorts: [{ property: "תאריך", direction: "ascending" }],
        },
        signal,
      );
      return response.results
        .map(pageToWeight)
        .filter((w): w is WeightEntry => w != null);
    },
  });

  const entries = !databaseId ? SAMPLE_WEIGHT : query.data ?? [];
  const current = entries.length > 0 ? entries[entries.length - 1].kg : null;
  const earliest = entries.length > 0 ? entries[0].kg : null;
  const goal = readGoal();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notion", "weight", databaseId] });

  const addMutation = useMutation({
    mutationFn: async (input: { date: string; kg: number }) => {
      if (!databaseId) throw new Error("Weight database not configured");
      await createNotionPage({
        databaseId,
        properties: {
          "תאריך": { date: { start: input.date } },
          "משקל": { number: input.kg },
        },
      });
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: { date: string; kg: number } }) => {
      if (id.startsWith("sample-")) return;
      await updateNotionPage({
        pageId: id,
        properties: {
          "תאריך": { date: { start: input.date } },
          "משקל": { number: input.kg },
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
      entries: SAMPLE_WEIGHT,
      loading: false,
      error: null,
      isConfigMissing: true,
      isSample: true,
      databaseId: null,
      current,
      earliest,
      goal,
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
    current,
    earliest,
    goal,
    addEntry: (input) => addMutation.mutateAsync(input),
    updateEntry: (id, input) => updateMutation.mutateAsync({ id, input }),
    removeEntry: (id) => removeMutation.mutateAsync(id),
    isMutating: addMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
}

export function setWeightGoal(kg: number | null): void {
  try {
    if (kg == null) localStorage.removeItem(GOAL_KG_KEY);
    else localStorage.setItem(GOAL_KG_KEY, String(kg));
  } catch { /* noop */ }
}
