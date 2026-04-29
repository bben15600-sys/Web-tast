import { describe, it, expect } from "vitest";
import { generateGroceryList, summarizeGroceryList, pantryItemsBelowThreshold } from "./groceryList";
import type { Recipe } from "@/hooks/useRecipes";
import type { MealPlanEntry } from "@/hooks/useMealPlan";
import type { PantryItem } from "@/hooks/usePantry";

function makeRecipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: "r1",
    name: "Test",
    servings: 4,
    category: null,
    totalMin: 10,
    difficulty: "קל",
    description: "",
    ingredients: [
      { name: "עגבניות", amount: 500, unit: "גרם" },
      { name: "שמן זית", amount: 2, unit: "כפ" },
    ],
    steps: [],
    tags: [],
    source: "sample",
    ...over,
  };
}

function makeEntry(over: Partial<MealPlanEntry> = {}): MealPlanEntry {
  return {
    id: "e1",
    date: "2026-04-26",
    slot: "ערב",
    recipeId: "r1",
    recipeName: null,
    notes: "",
    source: "sample",
    ...over,
  };
}

function makePantry(over: Partial<PantryItem> = {}): PantryItem {
  return {
    id: "p1",
    name: "עגבניות",
    qty: 200,
    unit: "גרם",
    category: "ירקות ופירות",
    reorderAt: 100,
    emoji: "🍅",
    source: "sample",
    ...over,
  };
}

describe("generateGroceryList", () => {
  it("returns empty list when meal plan is empty", () => {
    const result = generateGroceryList({ mealPlan: [], recipes: [], pantry: [] });
    expect(result).toEqual([]);
  });

  it("ignores meal plan entries without a recipe", () => {
    const result = generateGroceryList({
      mealPlan: [makeEntry({ recipeId: null })],
      recipes: [makeRecipe()],
      pantry: [],
    });
    expect(result).toEqual([]);
  });

  it("aggregates ingredients across multiple meals using same recipe", () => {
    const result = generateGroceryList({
      mealPlan: [
        makeEntry({ id: "e1", date: "2026-04-26", slot: "ערב" }),
        makeEntry({ id: "e2", date: "2026-04-27", slot: "צהריים" }),
      ],
      recipes: [makeRecipe()],
      pantry: [],
    });
    const tomato = result.find((r) => r.name === "עגבניות");
    expect(tomato).toBeDefined();
    expect(tomato!.amount).toBe(1000);
    expect(tomato!.fromMeals).toHaveLength(2);
  });

  it("aggregates same ingredient with same unit from different recipes", () => {
    const result = generateGroceryList({
      mealPlan: [
        makeEntry({ id: "e1", recipeId: "r1" }),
        makeEntry({ id: "e2", recipeId: "r2" }),
      ],
      recipes: [
        makeRecipe({ id: "r1", ingredients: [{ name: "אורז", amount: 200, unit: "גרם" }] }),
        makeRecipe({ id: "r2", ingredients: [{ name: "אורז", amount: 300, unit: "גרם" }] }),
      ],
      pantry: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });

  it("does NOT merge same ingredient with different units", () => {
    const result = generateGroceryList({
      mealPlan: [
        makeEntry({ id: "e1", recipeId: "r1" }),
        makeEntry({ id: "e2", recipeId: "r2" }),
      ],
      recipes: [
        makeRecipe({ id: "r1", ingredients: [{ name: "אורז", amount: 200, unit: "גרם" }] }),
        makeRecipe({ id: "r2", ingredients: [{ name: "אורז", amount: 1, unit: "כוס" }] }),
      ],
      pantry: [],
    });
    expect(result).toHaveLength(2);
  });

  it("marks items as already in pantry when matched", () => {
    const result = generateGroceryList({
      mealPlan: [makeEntry()],
      recipes: [makeRecipe()],
      pantry: [makePantry({ name: "עגבניות", qty: 800 })],
    });
    const tomato = result.find((r) => r.name === "עגבניות");
    expect(tomato!.inPantry).toBe(true);
    expect(tomato!.pantryQty).toBe(800);
  });

  it("treats zero-qty pantry items as not in pantry", () => {
    const result = generateGroceryList({
      mealPlan: [makeEntry()],
      recipes: [makeRecipe()],
      pantry: [makePantry({ name: "עגבניות", qty: 0 })],
    });
    const tomato = result.find((r) => r.name === "עגבניות");
    expect(tomato!.inPantry).toBe(false);
  });

  it("matches pantry items via fuzzy substring", () => {
    const result = generateGroceryList({
      mealPlan: [makeEntry()],
      recipes: [makeRecipe({ ingredients: [{ name: "עגבניות מרוסקות", amount: 400, unit: "גרם" }] })],
      pantry: [makePantry({ name: "עגבניות", qty: 500 })],
    });
    expect(result[0].inPantry).toBe(true);
  });

  it("categorizes ingredients correctly", () => {
    const result = generateGroceryList({
      mealPlan: [makeEntry()],
      recipes: [makeRecipe({
        ingredients: [
          { name: "עוף", amount: 500, unit: "גרם" },
          { name: "ביצים", amount: 6, unit: "יח" },
          { name: "אורז", amount: 200, unit: "גרם" },
          { name: "מלח", amount: 1, unit: "כפי" },
          { name: "עגבניות", amount: 4, unit: "יח" },
        ],
      })],
      pantry: [],
    });
    const cats = Object.fromEntries(result.map((r) => [r.name, r.category]));
    expect(cats["עוף"]).toBe("בשר ודגים");
    expect(cats["ביצים"]).toBe("מוצרי חלב");
    expect(cats["אורז"]).toBe("פחמימות");
    expect(cats["מלח"]).toBe("תבלינים");
    expect(cats["עגבניות"]).toBe("ירקות ופירות");
  });

  it("rounds aggregated amounts to 2 decimals", () => {
    const result = generateGroceryList({
      mealPlan: [makeEntry({ id: "e1" }), makeEntry({ id: "e2" }), makeEntry({ id: "e3" })],
      recipes: [makeRecipe({ ingredients: [{ name: "סוכר", amount: 0.333, unit: "כפ" }] })],
      pantry: [],
    });
    expect(result[0].amount).toBe(1);
  });
});

describe("summarizeGroceryList", () => {
  it("counts items by pantry status and groups by category", () => {
    const result = generateGroceryList({
      mealPlan: [makeEntry()],
      recipes: [makeRecipe({
        ingredients: [
          { name: "עוף", amount: 500, unit: "גרם" },
          { name: "עגבניות", amount: 400, unit: "גרם" },
        ],
      })],
      pantry: [makePantry({ name: "עגבניות", qty: 200 })],
    });
    const summary = summarizeGroceryList(result);
    expect(summary.totalItems).toBe(2);
    expect(summary.alreadyInPantry).toBe(1);
    expect(summary.needFromStore).toBe(1);
    expect(summary.byCategory["ירקות ופירות"]).toHaveLength(1);
    expect(summary.byCategory["בשר ודגים"]).toHaveLength(1);
  });
});

describe("pantryItemsBelowThreshold", () => {
  it("returns items at or below their reorder threshold", () => {
    const items = [
      makePantry({ id: "1", name: "a", qty: 100, reorderAt: 50 }),
      makePantry({ id: "2", name: "b", qty: 50, reorderAt: 50 }),
      makePantry({ id: "3", name: "c", qty: 0, reorderAt: 10 }),
      makePantry({ id: "4", name: "d", qty: 100, reorderAt: 200 }),
    ];
    const low = pantryItemsBelowThreshold(items);
    expect(low.map((i) => i.id).sort()).toEqual(["2", "3", "4"]);
  });
});
