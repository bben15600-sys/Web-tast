import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  extractTitle,
  extractRichText,
  extractDate,
  extractSelect,
  type NotionPage,
} from "@/lib/notion";

export type ScheduleEvent = {
  id: string;
  title: string;
  time: string;
  bg: string;
  accent: string;
  loc?: string;
  start: Date;
  end: Date | null;
};

export type ScheduleDay = {
  letter: string;
  name: string;
  date: string;
  iso: string;
  today: boolean;
};

export type WeekEvents = {
  days: ScheduleDay[];
  weekRangeLabel: string;
  events: ScheduleEvent[][];
};

// Maps a Notion `select` category to the dashboard palette.
// Extend / rename the keys to match the options configured in your Notion DB.
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

const HEBREW_DAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const HEBREW_DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

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
  weekStart?: Date;
};

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function formatDayMonth(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatTimeRange(start: Date, end: Date | null, allDay: boolean): string {
  if (allDay) return "כל היום";
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

function pageToEvent(page: NotionPage, properties: PropertyMap): ScheduleEvent | null {
  const dateProp = extractDate(page.properties[properties.date]);
  if (!dateProp) return null;

  const allDay = !dateProp.start.includes("T");
  const start = new Date(dateProp.start);
  const end = dateProp.end ? new Date(dateProp.end) : null;

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
    time: formatTimeRange(start, end, allDay),
    bg: palette.bg,
    accent: palette.accent,
    loc: loc || undefined,
    start,
    end,
  };
}

function buildDayMeta(weekStart: Date): ScheduleDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      letter: HEBREW_DAY_LETTERS[i],
      name: HEBREW_DAY_NAMES[i],
      date: formatDayMonth(d),
      iso: d.toISOString(),
      today: d.getTime() === today.getTime(),
    };
  });
}

function buildWeekLabel(weekStart: Date): string {
  const last = new Date(weekStart);
  last.setDate(last.getDate() + 6);
  return `${weekStart.getDate()} – ${last.getDate()} ${HEBREW_MONTHS[last.getMonth()]} ${last.getFullYear()}`;
}

export function useScheduleEvents(options: Options = {}): UseQueryResult<WeekEvents> & {
  databaseId: string | undefined;
} {
  const databaseId = options.databaseId ?? import.meta.env.VITE_NOTION_SCHEDULE_DB_ID;
  const properties: PropertyMap = { ...DEFAULT_PROPERTIES, ...options.properties };
  const weekStart = startOfWeekSunday(options.weekStart ?? new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const query = useQuery<WeekEvents>({
    queryKey: ["notion", "schedule", databaseId, weekStart.toISOString()],
    enabled: Boolean(databaseId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await queryNotionDatabase(
        {
          databaseId: databaseId!,
          filter: {
            and: [
              { property: properties.date, date: { on_or_after: weekStart.toISOString() } },
              { property: properties.date, date: { before: weekEnd.toISOString() } },
            ],
          },
          sorts: [{ property: properties.date, direction: "ascending" }],
          page_size: 100,
        },
        signal,
      );

      const buckets: ScheduleEvent[][] = Array.from({ length: 7 }, () => []);
      for (const page of response.results) {
        const event = pageToEvent(page, properties);
        if (!event) continue;
        const dayIndex = Math.floor(
          (event.start.getTime() - weekStart.getTime()) / 86_400_000,
        );
        if (dayIndex >= 0 && dayIndex < 7) buckets[dayIndex].push(event);
      }

      return {
        days: buildDayMeta(weekStart),
        weekRangeLabel: buildWeekLabel(weekStart),
        events: buckets,
      };
    },
  });

  return Object.assign(query, { databaseId });
}
