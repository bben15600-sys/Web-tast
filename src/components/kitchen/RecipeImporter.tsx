import { useState } from "react";
import { createNotionPage } from "@/lib/notion";
import type { RecipeIngredient, RecipeStep } from "@/hooks/useRecipes";

type ImportedRecipe = {
  name: string;
  description: string;
  servings: number;
  totalMin: number;
  difficulty: "קל" | "בינוני" | "מתקדם";
  category: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: string[];
};

export function RecipeImporter() {
  const recipesDbId = import.meta.env.VITE_NOTION_RECIPES_DB_ID as string | undefined;
  const [url, setUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportedRecipe | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const onParse = async () => {
    setError(null);
    setSavedId(null);
    setImported(null);
    if (!url.trim()) return;
    setParsing(true);
    try {
      const r = await fetch("/api/parse-recipe-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `שגיאה (${r.status})`);
      setImported(data.recipe as ImportedRecipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה לא ידועה");
    } finally {
      setParsing(false);
    }
  };

  const onSave = async () => {
    if (!imported || !recipesDbId) return;
    setSaving(true);
    setError(null);
    try {
      const properties = buildRecipeProperties(imported);
      const result = (await createNotionPage({ databaseId: recipesDbId, properties })) as { id?: string };
      setSavedId(result?.id ?? "saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass" style={{ padding: 20 }}>
      <div className="card-header" style={{ marginBottom: 14 }}>
        <h3 className="card-title">ייבוא מתכון מ-URL</h3>
        <span className="label-cap">מופעל ע"י Claude AI</span>
      </div>

      {!recipesDbId && (
        <div style={configMissingStyle}>
          ⚙️ ייבוא דורש <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>VITE_NOTION_RECIPES_DB_ID</code> כדי לשמור ל-Notion.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/recipe"
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--oslife-chip)",
            border: "1px solid var(--oslife-chip-border)",
            color: "var(--oslife-text-strong)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
            direction: "ltr",
            textAlign: "left",
          }}
          onKeyDown={(e) => { if (e.key === "Enter") onParse(); }}
        />
        <button
          type="button"
          disabled={parsing || !url.trim()}
          onClick={onParse}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(52,211,153,0.14)",
            border: "1px solid rgba(52,211,153,0.32)",
            color: "#34D399",
            fontSize: 13,
            fontWeight: 700,
            cursor: parsing ? "wait" : "pointer",
            fontFamily: "inherit",
            opacity: parsing || !url.trim() ? 0.5 : 1,
          }}
        >
          {parsing ? "מנתח…" : "✨ ייבא"}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {savedId && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(52,211,153,0.10)",
          border: "1px solid rgba(52,211,153,0.32)",
          color: "#34D399",
          fontSize: 13,
          marginBottom: 12,
        }}>
          ✓ המתכון נשמר ל-Notion
        </div>
      )}

      {imported && (
        <ImportedPreview
          recipe={imported}
          canSave={Boolean(recipesDbId) && !savedId}
          isSaving={saving}
          onSave={onSave}
        />
      )}

      {!imported && !error && !parsing && (
        <div style={emptyStateStyle}>
          הדבק קישור לדף מתכון (עברית או אנגלית) ולחץ "ייבא" — המודל יחלץ את המצרכים, השלבים והמטא-דאטה.
        </div>
      )}
    </section>
  );
}

function ImportedPreview({
  recipe,
  canSave,
  isSaving,
  onSave,
}: {
  recipe: ImportedRecipe;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div style={{
      background: "rgba(52,211,153,0.04)",
      border: "1px solid rgba(52,211,153,0.18)",
      borderRadius: 14,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <h4 style={{ fontSize: 17, fontWeight: 700, color: "var(--oslife-text-strong)" }}>{recipe.name}</h4>
      {recipe.description && (
        <p style={{ fontSize: 13, color: "var(--oslife-text-mid)", lineHeight: 1.6 }}>{recipe.description}</p>
      )}
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--oslife-text-mute)", flexWrap: "wrap" }}>
        <span>⏱ {recipe.totalMin} דק׳</span>
        <span>👤 {recipe.servings} מנות</span>
        <span>🔥 {recipe.difficulty}</span>
        {recipe.category && <span>· {recipe.category}</span>}
      </div>

      <details>
        <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--oslife-text-mid)" }}>
          {recipe.ingredients.length} מצרכים
        </summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {recipe.ingredients.map((ing, i) => (
            <span key={i} style={tagStyle}>
              {ing.amount} {ing.unit} {ing.name}
            </span>
          ))}
        </div>
      </details>

      <details>
        <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--oslife-text-mid)" }}>
          {recipe.steps.length} שלבי הכנה
        </summary>
        <ol style={{ paddingInlineStart: 20, marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {recipe.steps.map((step, i) => (
            <li key={i} style={{ fontSize: 12.5, color: "var(--oslife-text-mid)", lineHeight: 1.5 }}>
              {step.text}
              {step.timerSec ? <span style={{ color: "var(--oslife-text-mute)", marginInlineStart: 6 }}>({Math.round(step.timerSec / 60)} דק׳)</span> : null}
            </li>
          ))}
        </ol>
      </details>

      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || isSaving}
        style={{
          padding: "10px 18px",
          borderRadius: 10,
          background: "#34D399",
          color: "#0B0D24",
          fontSize: 13,
          fontWeight: 800,
          cursor: canSave && !isSaving ? "pointer" : "not-allowed",
          width: "fit-content",
          border: "none",
          marginTop: 4,
          opacity: canSave ? 1 : 0.5,
          fontFamily: "inherit",
        }}
      >
        {isSaving ? "שומר…" : "שמור ל-Notion ←"}
      </button>
    </div>
  );
}

function buildRecipeProperties(recipe: ImportedRecipe): Record<string, unknown> {
  const ingredientsBlock = recipe.ingredients
    .map((i) => `${i.amount} ${i.unit} ${i.name}`.trim())
    .join("\n");
  const stepsBlock = recipe.steps
    .map((s) => s.timerSec ? `${s.text} (${Math.round(s.timerSec / 60)} דקות)` : s.text)
    .join("\n");

  const properties: Record<string, unknown> = {
    "שם": { title: [{ text: { content: recipe.name } }] },
    "מנות": { number: recipe.servings },
    "זמן (דקות)": { number: recipe.totalMin },
    "רמת קושי": { select: { name: recipe.difficulty } },
    "תיאור": { rich_text: [{ text: { content: recipe.description.slice(0, 1900) } }] },
    "מצרכים": { rich_text: [{ text: { content: ingredientsBlock.slice(0, 1900) } }] },
    "הוראות": { rich_text: [{ text: { content: stepsBlock.slice(0, 1900) } }] },
  };
  if (recipe.category) {
    properties["קטגוריה"] = { select: { name: recipe.category } };
  }
  return properties;
}

const tagStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid var(--oslife-chip-border)",
  color: "var(--oslife-text-mid)",
};
const errorStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  color: "#FB7185",
  background: "rgba(251,113,133,0.08)",
  border: "1px solid rgba(251,113,133,0.28)",
  borderRadius: 8,
  marginBottom: 12,
};
const configMissingStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 11,
  color: "#FBBF24",
  background: "rgba(251,191,36,0.08)",
  border: "1px solid rgba(251,191,36,0.26)",
  borderRadius: 8,
  marginBottom: 12,
};
const emptyStateStyle: React.CSSProperties = {
  padding: "30px 12px",
  textAlign: "center",
  color: "var(--oslife-text-mute)",
  fontSize: 12.5,
  lineHeight: 1.7,
  background: "rgba(255,255,255,0.02)",
  borderRadius: 10,
  border: "1px dashed var(--oslife-chip-border)",
};
