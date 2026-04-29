import { useMemo, useState } from "react";
import AppShell from "@/components/dashboard/AppShell";
import { useRecipes, type Recipe } from "@/hooks/useRecipes";
import { useKitchenTimers } from "@/hooks/useKitchenTimers";
import { RecipeDetail } from "@/components/kitchen/RecipeDetail";
import { TimersPanel } from "@/components/kitchen/TimersPanel";
import { UnitConverter } from "@/components/kitchen/UnitConverter";
import { ChefChat } from "@/components/kitchen/ChefChat";
import { MealPlannerTab } from "@/components/kitchen/MealPlannerTab";
import { GroceryListTab } from "@/components/kitchen/GroceryListTab";
import { PantryTab } from "@/components/kitchen/PantryTab";
import { RecipeImporter } from "@/components/kitchen/RecipeImporter";
import { usePantry, pantryStatus } from "@/hooks/usePantry";

type KitchenTab =
  | "recipes"
  | "mealplan"
  | "grocery"
  | "pantry"
  | "import"
  | "chef"
  | "timers"
  | "converter";

const Kitchen = () => {
  const { data: recipes, isLoading, error, isSample } = useRecipes();
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [tab, setTab] = useState<KitchenTab>("recipes");
  const [query, setQuery] = useState("");
  const { timers } = useKitchenTimers();
  const { items: pantryItems } = usePantry();
  // Only currently-counting-down timers contribute to the badge. "Done"
  // timers are notifications, not activity; keeping them in the count
  // made the badge go stale until the user manually cleared them.
  const runningTimers = timers.filter((t) => t.state === "running").length;
  const lowPantryCount = pantryItems.filter((i) => pantryStatus(i) !== "ok").length;

  const activeRecipe = recipes.find((r) => r.id === activeRecipeId) ?? null;

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.category?.toLowerCase().includes(q),
    );
  }, [recipes, query]);

  return (
    <AppShell>
      <h1 className="sr-only">המטבח</h1>

      <div className="flex flex-col gap-5 kitchen-page">
        <KitchenHeader
          tab={tab}
          setTab={setTab}
          runningTimers={runningTimers}
          lowPantryCount={lowPantryCount}
          isSample={isSample}
          onBack={activeRecipe ? () => setActiveRecipeId(null) : undefined}
        />

        {tab === "recipes" && (
          activeRecipe ? (
            <RecipeDetail
              recipe={activeRecipe}
              onBack={() => setActiveRecipeId(null)}
            />
          ) : (
            <RecipeList
              recipes={filteredRecipes}
              query={query}
              setQuery={setQuery}
              onPick={(r) => setActiveRecipeId(r.id)}
              isLoading={isLoading}
              error={error}
            />
          )
        )}

        {tab === "mealplan" && <MealPlannerTab recipes={recipes} />}
        {tab === "grocery" && <GroceryListTab recipes={recipes} />}
        {tab === "pantry" && <PantryTab />}
        {tab === "import" && <RecipeImporter />}
        {tab === "chef" && <ChefChat />}
        {tab === "timers" && <TimersPanel />}
        {tab === "converter" && <UnitConverter />}
      </div>
    </AppShell>
  );
};

function KitchenHeader({
  tab,
  setTab,
  runningTimers,
  lowPantryCount,
  isSample,
  onBack,
}: {
  tab: KitchenTab;
  setTab: (t: KitchenTab) => void;
  runningTimers: number;
  lowPantryCount: number;
  isSample: boolean;
  onBack?: () => void;
}) {
  const tabs: Array<{ key: KitchenTab; label: string; icon: React.ReactNode }> = [
    {
      key: "recipes",
      label: "מתכונים",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H20v16H5.5A2.5 2.5 0 0 1 3 17.5z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      ),
    },
    {
      key: "mealplan",
      label: "תכנון",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </svg>
      ),
    },
    {
      key: "grocery",
      label: "קניות",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1.5" />
          <circle cx="18" cy="21" r="1.5" />
          <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
      ),
    },
    {
      key: "pantry",
      label: "מלאי",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h18v14H3z" />
          <path d="M3 7l3-4h12l3 4" />
          <path d="M3 12h18" />
        </svg>
      ),
    },
    {
      key: "import",
      label: "ייבוא",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
        </svg>
      ),
    },
    {
      key: "chef",
      label: "שף AI",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 19a4 4 0 0 1-2-7.5 6 6 0 0 1 11.3-3.2A5 5 0 1 1 18 18.5" />
          <path d="M7 20h10" />
        </svg>
      ),
    },
    {
      key: "timers",
      label: "טיימרים",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M9 2h6" />
        </svg>
      ),
    },
    {
      key: "converter",
      label: "ממיר",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3L21 7l-4 4" />
          <path d="M3 7h18" />
          <path d="M7 21l-4-4 4-4" />
          <path d="M21 17H3" />
        </svg>
      ),
    },
  ];

  return (
    <header className="flex flex-col gap-3" style={{ padding: "4px 4px 2px" }}>
      <div className="flex items-center justify-between" style={{ direction: "ltr" }}>
        <h1
          className="kitchen-title"
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: "var(--oslife-text-strong)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          המטבח
        </h1>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--oslife-text-mid)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← חזרה למתכונים
          </button>
        )}
      </div>

      <nav className="kitchen-tabs">
        {tabs.map((t) => {
          const active = tab === t.key;
          const count =
            t.key === "timers" && runningTimers > 0 ? runningTimers
            : t.key === "pantry" && lowPantryCount > 0 ? lowPantryCount
            : null;
          return (
            <button
              key={t.key}
              type="button"
              className={`kitchen-tab ${active ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              <span>{t.label}</span>
              {count != null && <span className="kitchen-tab-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      {isSample && tab === "recipes" && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: 11,
            color: "#FBBF24",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.26)",
            borderRadius: 8,
          }}
        >
          ⚙️ מוצגים מתכוני דוגמה. הוסף <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>VITE_NOTION_RECIPES_DB_ID</code> ב-Vercel כדי לנהל מתכונים מ-Notion.
        </div>
      )}
    </header>
  );
}

function RecipeList({
  recipes,
  query,
  setQuery,
  onPick,
  isLoading,
  error,
}: {
  recipes: Recipe[];
  query: string;
  setQuery: (q: string) => void;
  onPick: (r: Recipe) => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <>
      <div
        className="kitchen-search"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          height: 40,
          borderRadius: 12,
          background: "var(--oslife-chip)",
          border: "1px solid var(--oslife-chip-border)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--oslife-text-mute)" }}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם, קטגוריה, תגית…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--oslife-text-strong)",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(251,113,133,0.08)",
            border: "1px solid rgba(251,113,133,0.28)",
            color: "#FB7185",
            fontSize: 12,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 13 }}>
          טוען מתכונים…
        </div>
      ) : recipes.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--oslife-text-mute)", fontSize: 13 }}>
          {query ? "לא נמצאו מתכונים" : "אין מתכונים עדיין"}
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
        >
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => onPick(r)} />
          ))}
        </div>
      )}
    </>
  );
}

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const difficultyColor =
    recipe.difficulty === "קל"
      ? "#34D399"
      : recipe.difficulty === "בינוני"
        ? "#FBBF24"
        : "#FB7185";
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass recipe-card"
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "start",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="recipe-card-title"
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--oslife-text-strong)",
            letterSpacing: "-0.01em",
          }}
        >
          {recipe.name}
        </h3>
        {recipe.difficulty && (
          <span
            style={{
              fontSize: 10,
              color: difficultyColor,
              padding: "2px 8px",
              borderRadius: 999,
              background: `${difficultyColor}1A`,
              border: `1px solid ${difficultyColor}3D`,
              fontWeight: 600,
            }}
          >
            {recipe.difficulty}
          </span>
        )}
      </div>
      {recipe.description && (
        <p
          style={{
            fontSize: 12.5,
            color: "var(--oslife-text-mid)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}
        >
          {recipe.description}
        </p>
      )}
      <div className="flex items-center gap-3" style={{ marginTop: "auto", fontSize: 11, color: "var(--oslife-text-mute)", flexWrap: "wrap" }}>
        <span className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {recipe.totalMin} דק׳
        </span>
        <span className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          {recipe.servings} מנות
        </span>
        {recipe.category && (
          <span style={{ color: "var(--oslife-text-mid)" }}>· {recipe.category}</span>
        )}
      </div>
    </button>
  );
}

export default Kitchen;
