import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  queryNotionDatabase,
  createNotionPage,
  updateNotionPage,
  archiveNotionPage,
  extractTitle,
  extractNumber,
  extractRichText,
  extractSelect,
  type NotionPage,
} from "@/lib/notion";

export type PantryCategory =
  | "ירקות ופירות"
  | "בשר ודגים"
  | "מוצרי חלב"
  | "פחמימות"
  | "תבלינים"
  | "שימורים"
  | "אחר";

export type PantryItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  category: PantryCategory;
  reorderAt: number;
  emoji: string;
  source: "notion" | "sample";
};

export type PantryStatus = "ok" | "low" | "empty";

export function pantryStatus(item: PantryItem): PantryStatus {
  if (item.qty <= 0) return "empty";
  if (item.qty <= item.reorderAt) return "low";
  return "ok";
}

export type UsePantryResult = {
  items: PantryItem[];
  loading: boolean;
  error: string | null;
  isConfigMissing: boolean;
  isSample: boolean;
  databaseId: string | null;
  addItem: (input: Omit<PantryItem, "id" | "source">) => Promise<void>;
  updateQty: (id: string, qty: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  isMutating: boolean;
};

const SAMPLE_PANTRY: PantryItem[] = [
  { id: "sample-flour", name: "קמח", qty: 800, unit: "גרם", category: "פחמימות", reorderAt: 200, emoji: "🌾", source: "sample" },
  { id: "sample-oil", name: "שמן זית", qty: 150, unit: "מ\"ל", category: "אחר", reorderAt: 200, emoji: "🫒", source: "sample" },
  { id: "sample-sugar", name: "סוכר", qty: 0, unit: "גרם", category: "פחמימות", reorderAt: 100, emoji: "🧂", source: "sample" },
  { id: "sample-tomato", name: "רסק עגבניות", qty: 3, unit: "יח", category: "שימורים", reorderAt: 1, emoji: "🍅", source: "sample" },
  { id: "sample-eggs", name: "ביצים", qty: 2, unit: "יח", category: "מוצרי חלב", reorderAt: 6, emoji: "🥚", source: "sample" },
  { id: "sample-rice", name: "אורז", qty: 1200, unit: "גרם", category: "פחמימות", reorderAt: 300, emoji: "🍚", source: "sample" },
  { id: "sample-lentils", name: "עדשים", qty: 500, unit: "גרם", category: "פחמימות", reorderAt: 200, emoji: "🫘", source: "sample" },
  { id: "sample-honey", name: "דבש", qty: 0, unit: "גרם", category: "אחר", reorderAt: 50, emoji: "🍯", source: "sample" },
];

const VALID_CATEGORIES: PantryCategory[] = [
  "ירקות ופירות",
  "בשר ודגים",
  "מוצרי חלב",
  "פחמימות",
  "תבלינים",
  "שימורים",
  "אחר",
];

function normalizeCategory(s: string | null): PantryCategory {
  if (s && (VALID_CATEGORIES as string[]).includes(s)) return s as PantryCategory;
  return "אחר";
}

function pageToItem(page: NotionPage): PantryItem | null {
  const name = extractTitle(page.properties["שם"] ?? page.properties["Name"]);
  if (!name) return null;
  const qty = extractNumber(page.properties["כמות"] ?? page.properties["Quantity"]) ?? 0;
  const unit = extractRichText(page.properties["יחידה"] ?? page.properties["Unit"]) ?? "";
  const category = normalizeCategory(extractSelect(page.properties["קטגוריה"] ?? page.properties["Category"]));
  const reorderAt = extractNumber(page.properties["סף הזמנה"] ?? page.properties["ReorderAt"]) ?? 0;
  const emoji = extractRichText(page.properties["אימוג׳י"] ?? page.properties["Emoji"]) || "📦";
  return { id: page.id, name, qty, unit, category, reorderAt, emoji, source: "notion" };
}

export function usePantry(): UsePantryResult {
  const databaseId = import.meta.env.VITE_NOTION_PANTRY_DB_ID as string | undefined;
  const queryClient = useQueryClient();

  const query = useQuery<PantryItem[]>({
    queryKey: ["notion", "pantry", databaseId ?? "sample"],
    enabled: Boolean(databaseId),
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!databaseId) return SAMPLE_PANTRY;
      const response = await queryNotionDatabase({ databaseId, page_size: 100 }, signal);
      return response.results
        .map(pageToItem)
        .filter((i): i is PantryItem => i != null);
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notion", "pantry", databaseId] });

  const addMutation = useMutation({
    mutationFn: async (input: Omit<PantryItem, "id" | "source">) => {
      if (!databaseId) throw new Error("Pantry database not configured");
      await createNotionPage({
        databaseId,
        properties: {
          "שם": { title: [{ text: { content: input.name } }] },
          "כמות": { number: input.qty },
          "יחידה": { rich_text: [{ text: { content: input.unit } }] },
          "קטגוריה": { select: { name: input.category } },
          "סף הזמנה": { number: input.reorderAt },
          "אימוג׳י": { rich_text: [{ text: { content: input.emoji } }] },
        },
      });
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      if (id.startsWith("sample-")) return;
      await updateNotionPage({ pageId: id, properties: { "כמות": { number: qty } } });
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
      items: SAMPLE_PANTRY,
      loading: false,
      error: null,
      isConfigMissing: true,
      isSample: true,
      databaseId: null,
      addItem: async () => { /* no-op */ },
      updateQty: async () => { /* no-op */ },
      removeItem: async () => { /* no-op */ },
      isMutating: false,
    };
  }

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    isConfigMissing: false,
    isSample: false,
    databaseId,
    addItem: (input) => addMutation.mutateAsync(input),
    updateQty: (id, qty) => updateMutation.mutateAsync({ id, qty }),
    removeItem: (id) => removeMutation.mutateAsync(id),
    isMutating: addMutation.isPending || updateMutation.isPending || removeMutation.isPending,
  };
}
