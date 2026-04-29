import { useQuery } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  extractTitle,
  extractRichText,
  extractDate,
  extractSelect,
  type NotionPage,
} from "@/lib/notion";

export type TodayEvent = {
  id: string;
  title: string;
  time: string;
  bg: string;
  accent: string;
  loc?: string;
  start: Date;
};

export type UseTodayEventsResult = {
  events: TodayEvent[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
};

// Duplicated from useScheduleEvents so that hook stays untouched per task scope.
// If these ever drift, unify by extracting to a shared module.
const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  עבודה: { bg: "#3B82F6", accent: "#60A5FA" },
  משפחה: { bg: "#10B981", accent: "#34D399" },
  טיפול: { bg: "#9F3D4A", accent: "#FB7185" },
  לימוד: { bg: "#8B5CF6", accent: "#A78BFA" },
  חברים: { bg: "#B68A1F", accent: "#FBBF24" },
  work: { bg: "#3B82F6", accent: "#60A5FA" },
  family: { bg: "#10B981", accent: "#34D399" },
  health: { bg: "#9F3D4A", accent: "#FB7185" },
  learning: { bg: "#8B5CF6", accent: "#A78BFA" },
  social: { bg: "#B68A1F", accent: "#FBBF24" },
};

const DEFAULT_COLOR = { bg: "#3B82F6", accent: "#60A5FA" };

type PropertyMap = {
  title: string;
  date: string;
  location?: string;
  category?: string;
};

const DEFAULT_PROPERTIES: PropertyMap = {
  title: "Name",
  date: "Date",
  location: "Location",
  category: "Category",
};

type Options = {
  databaseId?: string;
  properties?: Partial<PropertyMap>;
};

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function pageToTodayEvent(page: NotionPage, properties: PropertyMap): TodayEvent | null {
  const dateProp = extractDate(page.properties[properties.date]);
  if (!dateProp) return null;

  const allDay = !dateProp.start.includes("T");
  const start = new Date(dateProp.start);

  const category = properties.category
    ? extractSelect(page.properties[properties.category])
    : null;
  const palette = (category && CATEGORY_COLORS[category]) || DEFAULT_COLOR;

  const loc = properties.location
    ? extractRichText(page.properties[properties.location])
    : "";

  return {
    id: page.id,
    title: extractTitle(page.properties[properties.title]) || "(ללא כותרת)",
    time: allDay ? "כל היום" : formatTime(start),
    bg: palette.bg,
    accent: palette.accent,
    loc: loc || undefined,
    start,
  };
}

export function useTodayEvents(options: Options = {}): UseTodayEventsResult {
  const databaseId = options.databaseId ?? import.meta.env.VITE_NOTION_SCHEDULE_DB_ID;
  const properties: PropertyMap = { ...DEFAULT_PROPERTIES, ...options.properties };

  const dayStart = startOfToday();
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const query = useQuery<TodayEvent[]>({
    queryKey: ["notion", "today", databaseId, dayStart.toISOString()],
    enabled: Boolean(databaseId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await queryNotionDatabase(
        {
          databaseId: databaseId!,
          filter: {
            and: [
              { property: properties.date, date: { on_or_after: dayStart.toISOString() } },
              { property: properties.date, date: { before: dayEnd.toISOString() } },
            ],
          },
          sorts: [{ property: properties.date, direction: "ascending" }],
          page_size: 100,
        },
        signal,
      );

      return response.results
        .map((page) => pageToTodayEvent(page, properties))
        .filter((e): e is TodayEvent => e != null);
    },
  });

  return {
    events: query.data ?? [],
    loading: Boolean(databaseId) && query.isLoading,
    error: query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Unknown error"
      : null,
    isConfigMissing: !databaseId,
  };
}
