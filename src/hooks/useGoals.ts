import { useQuery } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  extractTitle,
  extractNumber,
  extractCheckbox,
  type NotionPage,
  type NotionProperty,
} from "@/lib/notion";

export type Goal = {
  id: string;
  label: string;
  done: number;
  target: number;
  color: string;
};

export type UseGoalsResult = {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
};

// Rotating palette so each goal gets a distinct accent when the Notion row
// doesn't provide its own colour.
const FALLBACK_COLORS = [
  "#34D399", // mint
  "#FB7185", // coral
  "#A78BFA", // lavender
  "#FBBF24", // amber
  "#60A5FA", // sky
  "#22D3EE", // teal
];

const NOTION_COLOR_MAP: Record<string, string> = {
  green:  "#34D399",
  red:    "#FB7185",
  pink:   "#F472B6",
  purple: "#A78BFA",
  blue:   "#60A5FA",
  yellow: "#FBBF24",
  orange: "#F97316",
  gray:   "#B4B8D4",
  brown:  "#B68A1F",
  default:"#A78BFA",
};

// Try several common property names before giving up. The Notion database may
// have been set up in English ("Name" / "Done" / "Target") or Hebrew
// ("שם" / "בוצע" / "יעד"); this tolerates both without requiring a schema
// hand-off.
const TITLE_KEYS = ["Name", "שם", "Title", "כותרת", "יעד"];
const DONE_KEYS = ["Done", "בוצע", "Completed", "הושלם", "עשיתי", "נעשה", "התקדמות"];
const TARGET_KEYS = ["Target", "יעד", "Goal", "מטרה", "לבצע", "כמות"];
const COLOR_KEYS = ["Color", "צבע"];
const CHECKBOX_KEYS = ["Completed", "הושלם", "סיימתי"];

function firstDefined<T>(
  props: Record<string, NotionProperty>,
  keys: string[],
  transform: (p: NotionProperty | undefined) => T | null,
): T | null {
  for (const key of keys) {
    const v = transform(props[key]);
    if (v != null) return v;
  }
  return null;
}

function pickColor(
  props: Record<string, NotionProperty>,
  idx: number,
): string {
  // Explicit "Color" / "צבע" property takes precedence.
  for (const key of COLOR_KEYS) {
    const prop = props[key];
    if (!prop) continue;
    if (prop.type === "select" && prop.select) {
      const mapped = NOTION_COLOR_MAP[prop.select.color] ?? NOTION_COLOR_MAP[prop.select.name.toLowerCase()];
      if (mapped) return mapped;
    }
    if (prop.type === "rich_text") {
      const text = prop.rich_text.map((t) => t.plain_text).join("").trim();
      if (/^#[0-9a-f]{6}$/i.test(text)) return text;
      const mapped = NOTION_COLOR_MAP[text.toLowerCase()];
      if (mapped) return mapped;
    }
  }
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function pageToGoal(page: NotionPage, idx: number): Goal | null {
  const title = firstDefined(page.properties, TITLE_KEYS, (p) =>
    p && p.type === "title" ? extractTitle(p) : null,
  );
  if (!title) return null;

  const done = firstDefined(page.properties, DONE_KEYS, (p) =>
    p && p.type === "number" ? extractNumber(p) : null,
  );

  const target = firstDefined(page.properties, TARGET_KEYS, (p) =>
    p && p.type === "number" ? extractNumber(p) : null,
  );

  // Fallback: if there's a boolean "Completed" checkbox and no number
  // fields, treat it as done=checked?1:0, target=1.
  let finalDone = done ?? 0;
  let finalTarget = target ?? 0;
  if (done == null && target == null) {
    const completed = firstDefined(page.properties, CHECKBOX_KEYS, (p) =>
      p && p.type === "checkbox" ? extractCheckbox(p) : null,
    );
    if (completed != null) {
      finalDone = completed ? 1 : 0;
      finalTarget = 1;
    }
  }

  return {
    id: page.id,
    label: title,
    done: finalDone,
    target: finalTarget,
    color: pickColor(page.properties, idx),
  };
}

export function useGoals(databaseId?: string): UseGoalsResult {
  const dbId = databaseId ?? import.meta.env.VITE_NOTION_GOALS_DB_ID;

  const query = useQuery<Goal[]>({
    queryKey: ["notion", "goals", dbId],
    enabled: Boolean(dbId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await queryNotionDatabase(
        { databaseId: dbId!, page_size: 100 },
        signal,
      );
      return response.results
        .map((page, i) => pageToGoal(page, i))
        .filter((g): g is Goal => g != null);
    },
  });

  return {
    goals: query.data ?? [],
    loading: Boolean(dbId) && query.isLoading,
    error: query.isError ? (query.error instanceof Error ? query.error.message : "Unknown error") : null,
    isConfigMissing: !dbId,
  };
}
