import { useMemo, useState } from "react";
import { useKitchenTimers } from "@/hooks/useKitchenTimers";
import { fmtAmount } from "@/lib/kitchenUnits";
import type { Recipe } from "@/hooks/useRecipes";

const PORTION_PRESETS = [1, 2, 4, 6, 10, 20, 50, 100];

type Props = {
  recipe: Recipe;
  onBack: () => void;
};

export function RecipeDetail({ recipe, onBack }: Props) {
  const [servings, setServings] = useState(recipe.servings);
  const [cookMode, setCookMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { add: addTimer } = useKitchenTimers();

  const scale = servings / recipe.servings;
  const scaledIngredients = useMemo(
    () =>
      recipe.ingredients.map((ing) => ({
        ...ing,
        scaled: ing.amount * scale,
      })),
    [recipe.ingredients, scale],
  );

  // Helpful warning when scaling is non-trivial.
  const bulkWarning = servings >= 20
    ? "⚠️ בכמויות גדולות: התחל מ-75% מהמלח/חומצה/תבלינים וטעם לקראת הסוף. זמני בישול לא גדלים לינארית — תלוי בכלים שלך."
    : null;

  // Total scaled time — rough estimate; prep doesn't scale, cooking does partially.
  const estimatedTotalMin = Math.round(
    recipe.totalMin * (scale <= 1 ? 1 : 1 + Math.log2(scale) * 0.25),
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass recipe-hero" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="flex items-start justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="flex flex-col" style={{ flex: "1 1 280px", minWidth: 0 }}>
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
              {recipe.category && (
                <span className="label-cap" style={{ padding: "2px 8px", background: "rgba(201,100,66,0.12)", border: "1px solid rgba(201,100,66,0.24)", borderRadius: 999, color: "#E89A7D" }}>
                  {recipe.category}
                </span>
              )}
              {recipe.difficulty && (
                <span style={{ fontSize: 11, color: "var(--oslife-text-mid)" }}>· {recipe.difficulty}</span>
              )}
            </div>
            <h1
              className="recipe-title"
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--oslife-text-strong)",
                letterSpacing: "-0.02em",
                marginTop: 6,
                fontFamily: "'Frank Ruhl Libre', 'Fraunces', Georgia, serif",
              }}
            >
              {recipe.name}
            </h1>
            {recipe.description && (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--oslife-text-mid)",
                  lineHeight: 1.6,
                  marginTop: 8,
                }}
              >
                {recipe.description}
              </p>
            )}
            <div className="flex items-center gap-4" style={{ marginTop: 14, fontSize: 12, color: "var(--oslife-text-mid)" }}>
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                ~{estimatedTotalMin} דק׳
              </span>
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                {servings} מנות
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "var(--oslife-chip)",
              border: "1px solid var(--oslife-chip-border)",
              color: "var(--oslife-text-mid)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            ← חזרה
          </button>
        </div>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">כמות מנות</h2>
          <span className="mono" style={{ fontSize: 12, color: "var(--oslife-text-mute)" }}>
            × {scale.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2" style={{ flexWrap: "wrap", marginBottom: 14 }}>
          {PORTION_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setServings(n)}
              className={`preset-chip ${servings === n ? "is-active" : ""}`}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                background: servings === n ? "rgba(201,100,66,0.18)" : "var(--oslife-chip)",
                border: `1px solid ${servings === n ? "rgba(201,100,66,0.36)" : "var(--oslife-chip-border)"}`,
                color: servings === n ? "#E89A7D" : "var(--oslife-text-mid)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12, color: "var(--oslife-text-mid)" }}>מותאם אישית:</span>
          <input
            type="number"
            min={1}
            value={servings}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1) setServings(Math.round(n));
            }}
            style={{
              width: 80,
              padding: "6px 10px",
              background: "var(--oslife-chip)",
              border: "1px solid var(--oslife-chip-border)",
              borderRadius: 8,
              color: "var(--oslife-text-strong)",
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: "center",
              outline: "none",
            }}
          />
          <span style={{ fontSize: 12, color: "var(--oslife-text-mute)" }}>מנות</span>
        </div>

        {bulkWarning && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.26)",
              borderRadius: 8,
              color: "#FBBF24",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {bulkWarning}
          </div>
        )}
      </section>

      <section className="glass" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">מצרכים</h2>
          <span className="label-cap">{scaledIngredients.length}</span>
        </div>
        <ul className="flex flex-col gap-1" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {scaledIngredients.map((ing, i) => (
            <li
              key={i}
              className="flex items-center gap-3"
              style={{
                padding: "10px 12px",
                background: i % 2 === 0 ? "rgba(10,12,28,0.35)" : "transparent",
                borderRadius: 8,
              }}
            >
              <span
                className="mono currency"
                style={{
                  minWidth: 80,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#E89A7D",
                  textAlign: "end",
                }}
              >
                {ing.amount > 0 ? `${fmtAmount(ing.scaled)} ${ing.unit}`.trim() : ""}
              </span>
              <span style={{ fontSize: 14, color: "var(--oslife-text-strong)" }}>
                {ing.name}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass" style={{ ["--i" as string]: 4 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">הוראות</h2>
          <button
            type="button"
            onClick={() => { setCookMode(!cookMode); setCurrentStep(0); }}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: cookMode ? "rgba(201,100,66,0.18)" : "rgba(201,100,66,0.10)",
              border: "1px solid rgba(201,100,66,0.30)",
              color: "#E89A7D",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {cookMode ? "סיים מצב בישול" : "🔥 התחל בישול"}
          </button>
        </div>

        {cookMode ? (
          <CookMode
            steps={recipe.steps}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            recipeName={recipe.name}
            onAddTimer={(label, sec) => addTimer(label, sec)}
          />
        ) : (
          <ol className="flex flex-col gap-3" style={{ listStyle: "none", padding: 0, margin: 0, counterReset: "step" }}>
            {recipe.steps.map((step, i) => (
              <li
                key={i}
                style={{
                  padding: "14px 16px",
                  background: "rgba(10,12,28,0.35)",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "rgba(201,100,66,0.16)",
                    border: "1px solid rgba(201,100,66,0.32)",
                    color: "#E89A7D",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-2" style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 15,
                      color: "var(--oslife-text-strong)",
                      lineHeight: 1.65,
                      fontFamily: "'Frank Ruhl Libre', 'Fraunces', Georgia, serif",
                    }}
                  >
                    {step.text}
                  </span>
                  {step.timerSec != null && (
                    <button
                      type="button"
                      onClick={() => addTimer(`שלב ${i + 1} · ${recipe.name}`, step.timerSec!)}
                      style={{
                        alignSelf: "flex-start",
                        padding: "4px 12px",
                        borderRadius: 999,
                        background: "rgba(201,100,66,0.12)",
                        border: "1px solid rgba(201,100,66,0.28)",
                        color: "#C96442",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ⏲️ הפעל טיימר ({formatSec(step.timerSec)})
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function CookMode({
  steps,
  currentStep,
  setCurrentStep,
  recipeName,
  onAddTimer,
}: {
  steps: Recipe["steps"];
  currentStep: number;
  setCurrentStep: (n: number) => void;
  recipeName: string;
  onAddTimer: (label: string, sec: number) => string;
}) {
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        style={{
          padding: 20,
          background: "rgba(201,100,66,0.06)",
          border: "1px solid rgba(201,100,66,0.24)",
          borderRadius: 12,
          minHeight: 180,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span className="label-cap">
          שלב {currentStep + 1} מתוך {steps.length}
        </span>
        <p
          style={{
            fontSize: 22,
            lineHeight: 1.5,
            color: "var(--oslife-text-strong)",
            fontFamily: "'Frank Ruhl Libre', 'Fraunces', Georgia, serif",
            fontWeight: 500,
          }}
        >
          {step.text}
        </p>
        {step.timerSec != null && (
          <button
            type="button"
            onClick={() => onAddTimer(`שלב ${currentStep + 1} · ${recipeName}`, step.timerSec!)}
            style={{
              alignSelf: "flex-start",
              padding: "8px 18px",
              borderRadius: 999,
              background: "#C96442",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ⏲️ התחל טיימר — {formatSec(step.timerSec)}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={isFirst}
          style={{
            padding: "14px 24px",
            borderRadius: 12,
            background: "var(--oslife-chip)",
            border: "1px solid var(--oslife-chip-border)",
            color: isFirst ? "var(--oslife-text-mute)" : "var(--oslife-text-strong)",
            fontSize: 16,
            fontWeight: 600,
            cursor: isFirst ? "default" : "pointer",
            opacity: isFirst ? 0.4 : 1,
            fontFamily: "inherit",
            flex: 1,
          }}
        >
          → הקודם
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={isLast}
          style={{
            padding: "14px 24px",
            borderRadius: 12,
            background: isLast ? "var(--oslife-chip)" : "#C96442",
            border: isLast ? "1px solid var(--oslife-chip-border)" : "none",
            color: isLast ? "var(--oslife-text-mute)" : "white",
            fontSize: 16,
            fontWeight: 700,
            cursor: isLast ? "default" : "pointer",
            opacity: isLast ? 0.4 : 1,
            fontFamily: "inherit",
            flex: 1,
          }}
        >
          {isLast ? "סיימתי 🎉" : "הבא ←"}
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5" style={{ justifyContent: "center" }}>
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentStep(i)}
            aria-label={`עבור לשלב ${i + 1}`}
            style={{
              width: i === currentStep ? 20 : 8,
              height: 8,
              borderRadius: 999,
              background: i <= currentStep ? "#C96442" : "var(--oslife-chip)",
              border: "none",
              cursor: "pointer",
              transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function formatSec(sec: number): string {
  if (sec < 60) return `${sec} שניות`;
  if (sec < 3600) {
    const m = Math.round(sec / 60);
    return `${m} דקות`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m === 0 ? `${h} שעות` : `${h}ש׳ ${m}ד׳`;
}
