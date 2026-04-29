import { useQuery } from "@tanstack/react-query";
import {
  extractNumber,
  extractRichText,
  extractSelect,
  extractTitle,
  queryNotionDatabase,
  type NotionPage,
} from "@/lib/notion";

export type RecipeIngredient = {
  name: string;
  amount: number;
  unit: string;
};

export type RecipeStep = {
  text: string;
  /** Optional step duration in seconds — powers the inline "start timer" button. */
  timerSec?: number;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  category: string | null;
  totalMin: number;
  difficulty: "קל" | "בינוני" | "מתקדם" | null;
  description: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: string[];
  source: "notion" | "sample";
};

// Tiny but real sample set so the page is immediately useful even without
// a Notion Recipes DB configured. All amounts are for the listed servings;
// the UI handles scaling.
const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "sample-shakshuka",
    name: "שקשוקה קלאסית",
    servings: 4,
    category: "בוקר",
    totalMin: 25,
    difficulty: "קל",
    description: "שקשוקה ים-תיכונית קלאסית. ביצים רכות ברוטב עגבניות חריף, חובה עם פיתה טרייה.",
    ingredients: [
      { name: "שמן זית", amount: 3, unit: "כפ" },
      { name: "בצל גדול", amount: 1, unit: "יח" },
      { name: "שום", amount: 4, unit: "שן" },
      { name: "פלפל אדום", amount: 1, unit: "יח" },
      { name: "רסק עגבניות", amount: 2, unit: "כפ" },
      { name: "עגבניות מרוסקות", amount: 800, unit: "גרם" },
      { name: "פפריקה מתוקה", amount: 1, unit: "כפ" },
      { name: "כמון", amount: 1, unit: "כפי" },
      { name: "מלח", amount: 1, unit: "כפי" },
      { name: "ביצים", amount: 6, unit: "יח" },
      { name: "פטרוזיליה", amount: 0.25, unit: "כוס" },
    ],
    steps: [
      { text: "חממו שמן זית במחבת רחבה על אש בינונית." },
      { text: "הוסיפו בצל קצוץ וטגנו 5 דקות עד הזהבה.", timerSec: 5 * 60 },
      { text: "הוסיפו שום ופלפל קצוץ, טגנו עוד 3 דקות.", timerSec: 3 * 60 },
      { text: "הוסיפו רסק עגבניות, ערבבו דקה." },
      { text: "שפכו עגבניות מרוסקות, תבלו בפפריקה, כמון, מלח. בשלו 8 דקות עד שהרוטב מסמיך.", timerSec: 8 * 60 },
      { text: "עשו 6 גומות ברוטב, שברו ביצה לכל גומה." },
      { text: "כסו וחממו על אש נמוכה 4-6 דקות עד שהחלבון מתקרש.", timerSec: 5 * 60 },
      { text: "פזרו פטרוזיליה קצוצה והגישו חם עם פיתה." },
    ],
    tags: ["צמחוני", "ביצים", "מזרחי"],
    source: "sample",
  },
  {
    id: "sample-rice",
    name: "אורז לבן פרסי",
    servings: 6,
    category: "תוספת",
    totalMin: 30,
    difficulty: "קל",
    description: "אורז תפוח ואוורירי עם קראסט (טחדיג) זהוב בתחתית הסיר. קלאסיקה שעובדת תמיד.",
    ingredients: [
      { name: "אורז בסמטי", amount: 2, unit: "כוס" },
      { name: "מים", amount: 3, unit: "כוס" },
      { name: "שמן צמחי", amount: 3, unit: "כפ" },
      { name: "מלח", amount: 1, unit: "כפי" },
    ],
    steps: [
      { text: "שטפו את האורז במים קרים עד שהמים צלולים." },
      { text: "ספוגו 30 דקות במים פושרים עם כפית מלח.", timerSec: 30 * 60 },
      { text: "חממו סיר עם 2 כפות שמן, הוסיפו את האורז המסונן." },
      { text: "שפכו מים רותחים, הביאו לרתיחה ואז הנמיכו לאש קטנה." },
      { text: "כסו וטישטשו 18 דקות בלי לפתוח את המכסה.", timerSec: 18 * 60 },
      { text: "כבו את האש, עטפו את המכסה במגבת ותנו לנוח 5 דקות.", timerSec: 5 * 60 },
    ],
    tags: ["טבעוני", "ללא גלוטן"],
    source: "sample",
  },
  {
    id: "sample-hummus",
    name: "חומוס אבו-גוש-סטייל",
    servings: 8,
    category: "פתיחה",
    totalMin: 90,
    difficulty: "בינוני",
    description: "חומוס ביתי חלק וקרמי. הסוד: לבשל את הגרגירים הרבה זמן עם קצת סודה לשתייה.",
    ingredients: [
      { name: "חומוס יבש", amount: 500, unit: "גרם" },
      { name: "סודה לשתייה", amount: 1, unit: "כפי" },
      { name: "טחינה גולמית איכותית", amount: 1, unit: "כוס" },
      { name: "מיץ לימון", amount: 4, unit: "כפ" },
      { name: "שום", amount: 3, unit: "שן" },
      { name: "מלח", amount: 1, unit: "כפי" },
      { name: "מים קרים", amount: 0.75, unit: "כוס" },
    ],
    steps: [
      { text: "השרו את החומוס במים עם סודה לשתייה לילה שלם (לפחות 10 שעות).", timerSec: 10 * 60 * 60 },
      { text: "סננו, העבירו לסיר עם מים טריים, הביאו לרתיחה." },
      { text: "הסירו את הקצף שעולה, הנמיכו אש ובשלו 60-90 דקות עד שהגרגיר נמרח בקלות בין האצבעות.", timerSec: 70 * 60 },
      { text: "במעבד מזון טחנו שום עם מלח ומיץ לימון עד למחית." },
      { text: "הוסיפו טחינה וחצי כוס מים, טחנו עד שהמסה מתלבנת." },
      { text: "הוסיפו את הגרגירים החמים (בלי מים) וטחנו 5 דקות עד קרם חלק לגמרי.", timerSec: 5 * 60 },
      { text: "תקנו מלח/לימון/מים לפי הטעם. הגישו פושר עם שמן זית, פפריקה ופטרוזיליה." },
    ],
    tags: ["טבעוני", "ללא גלוטן", "מנת פתיחה"],
    source: "sample",
  },
];

function parseIngredientsBlock(block: string): RecipeIngredient[] {
  // Loose parser: each non-empty line looks like "500 גרם קמח" or "2 כוסות סוכר"
  // or "ביצים - 3" — handle a few shapes.
  const rows: RecipeIngredient[] = [];
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // "ingredient - amount unit"
    const dashMatch = line.match(/^(.+?)\s*[-–]\s*([\d.,/]+)\s*([^\d]*)$/);
    if (dashMatch) {
      const [, name, amountStr, unit] = dashMatch;
      rows.push({ name: name.trim(), amount: parseFraction(amountStr), unit: (unit || "").trim() });
      continue;
    }
    // "amount unit ingredient"
    const leadMatch = line.match(/^([\d.,/]+)\s*([^\d\s]+)?\s+(.+)$/);
    if (leadMatch) {
      const [, amountStr, unit, name] = leadMatch;
      rows.push({ name: name.trim(), amount: parseFraction(amountStr), unit: (unit || "").trim() });
      continue;
    }
    // Fall back — treat the whole line as a single ingredient with no amount.
    rows.push({ name: line, amount: 0, unit: "" });
  }
  return rows;
}

function parseFraction(s: string): number {
  const trim = s.replace(/,/g, ".").trim();
  if (trim.includes("/")) {
    const [a, b] = trim.split("/").map((x) => Number(x));
    return b ? a / b : 0;
  }
  const n = Number(trim);
  return Number.isFinite(n) ? n : 0;
}

function parseStepsBlock(block: string): RecipeStep[] {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // Extract an optional "(N דקות)" hint and convert to timerSec.
      const m = line.match(/\((\d+)\s*דקות?\)/);
      if (m) {
        return { text: line, timerSec: Number(m[1]) * 60 };
      }
      return { text: line };
    });
}

function pageToRecipe(page: NotionPage): Recipe | null {
  const name = extractTitle(page.properties["שם"]) || extractTitle(page.properties["Name"]);
  if (!name) return null;
  const servings = extractNumber(page.properties["מנות"]) ?? extractNumber(page.properties["Servings"]) ?? 4;
  const totalMin = extractNumber(page.properties["זמן (דקות)"]) ?? extractNumber(page.properties["Time"]) ?? 30;
  const difficulty = (extractSelect(page.properties["רמת קושי"]) || extractSelect(page.properties["Difficulty"])) as Recipe["difficulty"];
  const description = extractRichText(page.properties["תיאור"]) || extractRichText(page.properties["Description"]) || "";
  const category = extractSelect(page.properties["קטגוריה"]) || extractSelect(page.properties["Category"]);
  const ingredientsText = extractRichText(page.properties["מצרכים"]) || extractRichText(page.properties["Ingredients"]) || "";
  const stepsText = extractRichText(page.properties["הוראות"]) || extractRichText(page.properties["Steps"]) || "";
  return {
    id: page.id,
    name,
    servings,
    totalMin,
    difficulty,
    description,
    category,
    ingredients: parseIngredientsBlock(ingredientsText),
    steps: parseStepsBlock(stepsText),
    tags: [],
    source: "notion",
  };
}

export function useRecipes() {
  const databaseId = import.meta.env.VITE_NOTION_RECIPES_DB_ID as string | undefined;

  const query = useQuery<Recipe[]>({
    queryKey: ["recipes", databaseId ?? "sample"],
    enabled: Boolean(databaseId),
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!databaseId) return SAMPLE_RECIPES;
      const response = await queryNotionDatabase(
        { databaseId, page_size: 100, integration: "default" },
        signal,
      );
      const recipes = response.results
        .map(pageToRecipe)
        .filter((r): r is Recipe => r != null);
      // If the DB is empty, fall back to samples so the UI isn't blank.
      return recipes.length > 0 ? recipes : SAMPLE_RECIPES;
    },
  });

  if (!databaseId) {
    return {
      data: SAMPLE_RECIPES,
      isLoading: false,
      error: null,
      databaseId: null,
      isSample: true,
    };
  }

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    databaseId,
    isSample: false,
  };
}
