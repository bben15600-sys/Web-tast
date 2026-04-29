import type { Recipe, RecipeIngredient } from "@/hooks/useRecipes";
import type { MealPlanEntry } from "@/hooks/useMealPlan";
import type { PantryItem, PantryCategory } from "@/hooks/usePantry";

export type GroceryItem = {
  key: string;
  name: string;
  amount: number;
  unit: string;
  category: PantryCategory;
  fromMeals: string[];
  inPantry: boolean;
  pantryQty: number;
};

export type GroceryListInputs = {
  mealPlan: MealPlanEntry[];
  recipes: Recipe[];
  pantry: PantryItem[];
};

const VEG_FRUIT = ["עגבניה", "עגבניות", "מלפפון", "פלפל", "בצל", "שום", "פטרוזיליה", "כוסברה", "בננה", "בננות", "תפוח", "תפוז", "לימון", "גזר", "ירק", "פירות", "סלט"];
const MEAT_FISH = ["עוף", "חזה", "טונה", "סלמון", "בקר", "בשר", "דג", "שניצל", "המבורגר", "כתף"];
const DAIRY = ["חלב", "גבינה", "יוגורט", "ביצה", "ביצים", "שמנת", "חמאה", "קוטג'", "לבן"];
const CARBS = ["אורז", "פסטה", "לחם", "פיתה", "קמח", "קוסקוס", "בורגול", "פתיתים", "שיבולת", "עדשים", "חומוס", "תפוח אדמה", "תפו\"א"];
const SPICES = ["מלח", "פלפל שחור", "פפריקה", "כמון", "כורכום", "אורגנו", "תבלין", "סוכר", "בייקינג"];
const CANNED = ["שימור", "קופסה", "רסק", "רוטב", "מרינדה"];

function categorize(name: string): PantryCategory {
  const lower = name.toLowerCase();
  if (VEG_FRUIT.some((k) => lower.includes(k))) return "ירקות ופירות";
  if (MEAT_FISH.some((k) => lower.includes(k))) return "בשר ודגים";
  if (DAIRY.some((k) => lower.includes(k))) return "מוצרי חלב";
  if (CARBS.some((k) => lower.includes(k))) return "פחמימות";
  if (SPICES.some((k) => lower.includes(k))) return "תבלינים";
  if (CANNED.some((k) => lower.includes(k))) return "שימורים";
  return "אחר";
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

function aggregationKey(name: string, unit: string): string {
  return `${normalizeName(name)}|${normalizeUnit(unit)}`;
}

function findPantryMatch(name: string, pantry: PantryItem[]): PantryItem | null {
  const target = normalizeName(name);
  for (const item of pantry) {
    const itemName = normalizeName(item.name);
    if (itemName === target) return item;
    if (itemName.includes(target) || target.includes(itemName)) return item;
  }
  return null;
}

export function generateGroceryList(inputs: GroceryListInputs): GroceryItem[] {
  const { mealPlan, recipes, pantry } = inputs;
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  type Bucket = {
    name: string;
    amount: number;
    unit: string;
    category: PantryCategory;
    fromMeals: Set<string>;
  };
  const buckets = new Map<string, Bucket>();

  for (const entry of mealPlan) {
    if (!entry.recipeId) continue;
    const recipe = recipeById.get(entry.recipeId);
    if (!recipe) continue;

    const dateLabel = `${entry.date} (${entry.slot})`;
    for (const ing of recipe.ingredients) {
      addIngredient(buckets, ing, dateLabel);
    }
  }

  const result: GroceryItem[] = [];
  for (const [key, bucket] of buckets) {
    const pantryMatch = findPantryMatch(bucket.name, pantry);
    const pantryQty = pantryMatch ? pantryMatch.qty : 0;
    const inPantry = pantryQty > 0;
    result.push({
      key,
      name: bucket.name,
      amount: Math.round(bucket.amount * 100) / 100,
      unit: bucket.unit,
      category: bucket.category,
      fromMeals: Array.from(bucket.fromMeals),
      inPantry,
      pantryQty,
    });
  }

  return result.sort((a, b) => {
    const catCompare = a.category.localeCompare(b.category);
    if (catCompare !== 0) return catCompare;
    return a.name.localeCompare(b.name);
  });
}

function addIngredient(
  buckets: Map<string, { name: string; amount: number; unit: string; category: PantryCategory; fromMeals: Set<string> }>,
  ing: RecipeIngredient,
  fromMeal: string,
): void {
  const key = aggregationKey(ing.name, ing.unit);
  const existing = buckets.get(key);
  if (existing) {
    existing.amount += ing.amount;
    existing.fromMeals.add(fromMeal);
    return;
  }
  buckets.set(key, {
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    category: categorize(ing.name),
    fromMeals: new Set([fromMeal]),
  });
}

export type GroceryListSummary = {
  totalItems: number;
  needFromStore: number;
  alreadyInPantry: number;
  byCategory: Record<PantryCategory, GroceryItem[]>;
};

export function summarizeGroceryList(items: GroceryItem[]): GroceryListSummary {
  const byCategory: Record<string, GroceryItem[]> = {};
  let needFromStore = 0;
  let alreadyInPantry = 0;
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
    if (item.inPantry) alreadyInPantry++;
    else needFromStore++;
  }
  return {
    totalItems: items.length,
    needFromStore,
    alreadyInPantry,
    byCategory: byCategory as Record<PantryCategory, GroceryItem[]>,
  };
}

export function pantryItemsBelowThreshold(pantry: PantryItem[]): PantryItem[] {
  return pantry.filter((item) => item.qty <= item.reorderAt);
}
