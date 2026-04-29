import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  extractTitle,
  extractNumber,
  extractSelect,
  type NotionPage,
} from "@/lib/notion";

export type Holding = {
  id: string;
  name: string;
  symbol: string | null;
  value: number;
  changePct: number;
  alloc: number;
  changeColor: string;
  spark: string;
  data: number[];
};

export type InvestmentsView = {
  holdings: Holding[];
  total: number;
  totalChangePct: number;
};

// Keyed by the `Type` select option name in Notion.
// Rename / extend to match the options configured in your DB.
const TYPE_COLORS: Record<string, { bg: string; spark: string }> = {
  ETF: { bg: "#10B981", spark: "#34D399" },
  Stock: { bg: "#8B5CF6", spark: "#A78BFA" },
  Cash: { bg: "#B68A1F", spark: "#FBBF24" },
  Crypto: { bg: "#9F3D4A", spark: "#FB7185" },
  Bond: { bg: "#3B82F6", spark: "#60A5FA" },
  מזומן: { bg: "#B68A1F", spark: "#FBBF24" },
  מניות: { bg: "#8B5CF6", spark: "#A78BFA" },
  קריפטו: { bg: "#9F3D4A", spark: "#FB7185" },
  אגח: { bg: "#3B82F6", spark: "#60A5FA" },
};

const FALLBACK_PALETTE = [
  { bg: "#3B82F6", spark: "#60A5FA" },
  { bg: "#10B981", spark: "#34D399" },
  { bg: "#8B5CF6", spark: "#A78BFA" },
  { bg: "#B68A1F", spark: "#FBBF24" },
  { bg: "#9F3D4A", spark: "#FB7185" },
];

const POSITIVE = "#34D399";
const NEGATIVE = "#FB7185";
const NEUTRAL = "#A78BFA";

type PropertyMap = {
  name: string;
  value: string;
  change: string;
  type?: string;
};

const DEFAULT_PROPERTIES: PropertyMap = {
  name: "Name",
  value: "Value",
  change: "Change",
  type: "Type",
};

type Options = {
  databaseId?: string;
  properties?: Partial<PropertyMap>;
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic 12-point trend line that ends trending in the direction of
// changePct. Purely synthetic — Notion does not store historical price data.
function syntheticSparkline(seed: string, changePct: number): number[] {
  const h = hashString(seed);
  const points = 12;
  const start = 100;
  const end = 100 + changePct;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const base = start + (end - start) * t;
    const noise = (((h >> (i * 2)) & 0xf) - 7) * 0.4;
    out.push(base + noise);
  }
  return out;
}

function parseSymbolAndName(raw: string): { symbol: string | null; name: string } {
  const trimmed = raw.trim();
  // Pattern A: "SYMBOL - Name" / "SYMBOL – Name" / "SYMBOL — Name"
  const withSep = trimmed.match(/^([A-Za-z0-9.^-]{1,10})\s*[-–—]\s*(.+)$/);
  if (withSep) {
    return { symbol: withSep[1].toUpperCase(), name: withSep[2].trim() };
  }
  // Pattern B: the whole name is itself a ticker-like token, e.g. "TSLA",
  // "nvda", "^DJI", "TEVA.TA". Must be ASCII, 1–8 chars, no spaces, contains
  // at least one letter (so we don't treat a bare number as a ticker).
  if (/^[A-Za-z0-9.^]{1,8}$/.test(trimmed) && /[A-Za-z]/.test(trimmed)) {
    return { symbol: trimmed.toUpperCase(), name: trimmed };
  }
  return { symbol: null, name: trimmed };
}

function pageToHolding(
  page: NotionPage,
  properties: PropertyMap,
  index: number,
): Holding | null {
  const rawName = extractTitle(page.properties[properties.name]);
  const value = extractNumber(page.properties[properties.value]);
  if (!rawName || value == null) return null;

  const changePct = extractNumber(page.properties[properties.change]) ?? 0;
  const type = properties.type
    ? extractSelect(page.properties[properties.type])
    : null;
  const palette =
    (type && TYPE_COLORS[type]) || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];

  const { symbol, name } = parseSymbolAndName(rawName);
  const changeColor =
    changePct > 0 ? POSITIVE : changePct < 0 ? NEGATIVE : NEUTRAL;

  return {
    id: page.id,
    name,
    symbol,
    value,
    changePct,
    alloc: 0,
    changeColor,
    spark: palette.spark,
    data: syntheticSparkline(page.id, changePct),
  };
}

export function useInvestments(
  options: Options = {},
): UseQueryResult<InvestmentsView> & { databaseId: string | undefined } {
  const databaseId = options.databaseId ?? import.meta.env.VITE_NOTION_INVESTMENTS_DB_ID;
  const properties: PropertyMap = { ...DEFAULT_PROPERTIES, ...options.properties };

  const query = useQuery<InvestmentsView>({
    queryKey: ["notion", "investments", databaseId],
    enabled: Boolean(databaseId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await queryNotionDatabase(
        {
          databaseId: databaseId!,
          sorts: [{ property: properties.value, direction: "descending" }],
          page_size: 100,
        },
        signal,
      );

      const raw = response.results
        .map((page, i) => pageToHolding(page, properties, i))
        .filter((h): h is Holding => h != null);

      const total = raw.reduce((sum, h) => sum + h.value, 0);
      const totalChangePct =
        total > 0
          ? raw.reduce((sum, h) => sum + h.value * h.changePct, 0) / total
          : 0;

      const holdings: Holding[] = raw.map((h) => ({
        ...h,
        alloc: total > 0 ? (h.value / total) * 100 : 0,
      }));

      return { holdings, total, totalChangePct };
    },
  });

  return Object.assign(query, { databaseId });
}
