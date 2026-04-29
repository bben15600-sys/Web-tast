import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

// Single Anthropic-backed router that handles three AI endpoints:
//   /api/ai?type=daily-insight       → home-page daily briefing summary
//   /api/ai?type=health-insight      → /health page weekly summary
//   /api/ai?type=parse-recipe-url    → recipe importer
// vercel.json rewrites the public URLs (/api/daily-insight, etc.) to
// this router so the client code stays unchanged. Consolidating into
// one function keeps us under Vercel's Hobby-tier 12-function limit.

const ACCEPTED_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_KEY",
  "ANTHROPIC_TOKEN",
  "CLAUDE_API_KEY",
  "CLAUDE_KEY",
  "CLAUDE_TOKEN",
] as const;

function pickApiKey(): string | undefined {
  const acceptedUpper = new Set(ACCEPTED_KEYS.map((k) => k.toUpperCase()));
  for (const [name, value] of Object.entries(process.env)) {
    if (acceptedUpper.has(name.toUpperCase()) && typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

// ── Daily insight ─────────────────────────────────────────────────────────────
const DAILY_PROMPT = `אתה כותב סיכום יומי קצר לדשבורד אישי בעברית.

המטרה: פסקה אחת קצרה (2-4 משפטים) שמסכמת את היום של המשתמש בשפה שיחתית, אנושית, חמה אך תכליתית.

כללי ברזל:
1. תמיד בעברית. אל תכתוב מילה באנגלית, חוץ מסמלי מניות (NVDA, VOO).
2. פסקה רציפה אחת. לא רשימות, לא Markdown, לא כותרות, לא bullets.
3. דבר ישירות אל המשתמש בגוף שני ("היום אצלך…", "כדאי לשים לב…").
4. אל תמציא מספרים — השתמש רק במה שמופיע בנתונים שאקבל.
5. אם אין כלום מהותי לדווח על תחום מסוים — דלג עליו, אל תמציא.
6. אורך: 2-4 משפטים, בערך 30-60 מילים.
7. סדר עדיפויות (אם יש כמה דברים): חריגות תקציב → חיובים בקרוב → תנועות חזקות בשוק → לוז → יעדים.
8. אל תפתח ב"בוקר טוב" / "ערב טוב" — זה כבר מופיע בכותרת מעליך.
9. אל תסיים בסיסמאות מוטיבציה. תכליתי בלבד.`;

type DailyInsightContext = {
  date?: string;
  greetingPart?: "morning" | "afternoon" | "evening";
  todayEvents?: Array<{ title: string; time: string }>;
  budget?: {
    monthLabel: string;
    spent: number;
    budget: number;
    percent: number;
    projectedPercent: number;
    daysRemaining: number;
    overshootCategories: Array<{ name: string; percent: number; over: number }>;
  };
  market?: {
    holdings: Array<{ name: string; symbol: string; changePct: number }>;
    portfolioChangeIls: number | null;
  };
  goals?: Array<{ label: string; done: number; target: number; atRisk: boolean }>;
  upcomingBills?: Array<{ name: string; date: string; amount: number }>;
};

function formatDailyContext(ctx: DailyInsightContext): string {
  const lines: string[] = [];
  if (ctx.date) lines.push(`תאריך: ${ctx.date}`);
  if (ctx.greetingPart) {
    const map = { morning: "בוקר", afternoon: "צהריים", evening: "ערב" };
    lines.push(`חלק היום: ${map[ctx.greetingPart]}`);
  }
  if (ctx.todayEvents && ctx.todayEvents.length > 0) {
    lines.push("");
    lines.push(`לוז היום (${ctx.todayEvents.length} אירועים):`);
    for (const e of ctx.todayEvents.slice(0, 8)) {
      lines.push(`  • ${e.time} — ${e.title}`);
    }
  } else {
    lines.push("");
    lines.push("לוז היום: ריק");
  }
  if (ctx.budget) {
    lines.push("");
    lines.push(`תקציב ${ctx.budget.monthLabel}:`);
    lines.push(`  • הוצאות: ₪${ctx.budget.spent.toLocaleString()} מתוך ₪${ctx.budget.budget.toLocaleString()} (${ctx.budget.percent}%)`);
    lines.push(`  • קצב צפוי: ${ctx.budget.projectedPercent}%`);
    lines.push(`  • ימים נותרו בחודש: ${ctx.budget.daysRemaining}`);
    if (ctx.budget.overshootCategories.length > 0) {
      lines.push(`  • חריגות:`);
      for (const c of ctx.budget.overshootCategories) {
        lines.push(`    - ${c.name}: ${c.percent}% (₪${c.over.toLocaleString()} מעל)`);
      }
    }
  }
  if (ctx.market && ctx.market.holdings.length > 0) {
    lines.push("");
    lines.push("שוק (תיק אישי):");
    for (const h of ctx.market.holdings) {
      const sign = h.changePct >= 0 ? "+" : "";
      lines.push(`  • ${h.symbol} (${h.name}): ${sign}${h.changePct.toFixed(2)}%`);
    }
    if (ctx.market.portfolioChangeIls != null) {
      const sign = ctx.market.portfolioChangeIls >= 0 ? "+" : "";
      lines.push(`  • שינוי בתיק היום: ${sign}₪${Math.round(ctx.market.portfolioChangeIls).toLocaleString()}`);
    }
  }
  if (ctx.goals && ctx.goals.length > 0) {
    lines.push("");
    lines.push("יעדי השבוע:");
    for (const g of ctx.goals) {
      const tag = g.done >= g.target && g.target > 0 ? " (הושלם)" : g.atRisk ? " (בסיכון)" : "";
      lines.push(`  • ${g.label}: ${g.done}/${g.target}${tag}`);
    }
  }
  if (ctx.upcomingBills && ctx.upcomingBills.length > 0) {
    lines.push("");
    lines.push("חיובים קרובים (7 ימים):");
    for (const b of ctx.upcomingBills.slice(0, 8)) {
      lines.push(`  • ${b.date}: ${b.name} — ₪${Math.round(b.amount).toLocaleString()}`);
    }
  }
  return lines.join("\n");
}

// ── Health insight ────────────────────────────────────────────────────────────
const HEALTH_PROMPT = `אתה כותב תובנת בריאות יומית קצרה לדשבורד אישי בעברית.

מטרה: פסקה אחת קצרה (2-4 משפטים) המסכמת את מצב הספורט, השינה והמשקל של המשתמש.

כללי ברזל:
1. תמיד בעברית. ללא Markdown, ללא רשימות, ללא bullets, פסקה רציפה.
2. דבר ישירות אל המשתמש בגוף שני ("השבוע אצלך…").
3. אל תמציא מספרים — השתמש רק בנתונים שאקבל.
4. סדר עדיפויות: בעיות שינה דחופות → ירידה בפעילות → מגמת משקל לא בריאה → סיכומים חיוביים.
5. אורך: 2-4 משפטים, 30-60 מילים.
6. ללא פתיחות "בוקר טוב" וללא סיסמאות מוטיבציה.
7. תכליתי בלבד. אם יש דבר אחד מהותי לציין — תציין רק אותו.`;

type HealthContext = {
  date?: string;
  weekStats?: {
    workouts: number;
    totalMinutes: number;
    totalKcal: number;
    byType: Record<string, number>;
    workoutDelta: number;
    kcalDelta: number;
  };
  sleep?: { avgHours: number; delta: number; worstDayHours: number | null };
  weight?: { current: number | null; goal: number | null; monthChange: number | null; direction: "down" | "up" | "flat" | null };
};

function formatHealthContext(ctx: HealthContext): string {
  const lines: string[] = [];
  if (ctx.date) lines.push(`תאריך: ${ctx.date}`);
  if (ctx.weekStats) {
    lines.push("", "פעילות השבוע:");
    lines.push(`  • ${ctx.weekStats.workouts} אימונים`);
    lines.push(`  • ${ctx.weekStats.totalMinutes} דקות סך הכל`);
    lines.push(`  • ${ctx.weekStats.totalKcal} קלוריות נשרפו`);
    if (Object.keys(ctx.weekStats.byType).length > 0) {
      const types = Object.entries(ctx.weekStats.byType).map(([t, n]) => `${t} ×${n}`).join(", ");
      lines.push(`  • סוגים: ${types}`);
    }
    if (ctx.weekStats.workoutDelta !== 0) {
      lines.push(`  • שינוי משבוע שעבר: ${ctx.weekStats.workoutDelta > 0 ? "+" : ""}${ctx.weekStats.workoutDelta} אימונים`);
    }
  }
  if (ctx.sleep) {
    lines.push("", `שינה (ממוצע השבוע): ${ctx.sleep.avgHours} שעות`);
    if (ctx.sleep.delta !== 0) {
      lines.push(`  • שינוי משבוע שעבר: ${ctx.sleep.delta > 0 ? "+" : ""}${ctx.sleep.delta} שעות`);
    }
    if (ctx.sleep.worstDayHours != null && ctx.sleep.worstDayHours < 6) {
      lines.push(`  • היום עם הכי פחות שינה: ${ctx.sleep.worstDayHours} שעות`);
    }
  }
  if (ctx.weight) {
    lines.push("", "משקל:");
    if (ctx.weight.current != null) lines.push(`  • נוכחי: ${ctx.weight.current} ק"ג`);
    if (ctx.weight.goal != null) lines.push(`  • יעד: ${ctx.weight.goal} ק"ג`);
    if (ctx.weight.monthChange != null) {
      lines.push(`  • שינוי בחודש: ${ctx.weight.monthChange > 0 ? "+" : ""}${ctx.weight.monthChange} ק"ג`);
    }
  }
  return lines.join("\n");
}

// ── Recipe parser ─────────────────────────────────────────────────────────────
const RECIPE_PROMPT = `אתה מחלץ מתכונים מתוכן HTML של אתרי בישול בעברית או באנגלית.

הפלט שלך חייב להיות JSON תקין בלבד, ללא שום טקסט נוסף לפניו או אחריו, בפורמט הבא:
{
  "name": "string — שם המתכון בעברית",
  "description": "string — תיאור קצר 1-2 משפטים",
  "servings": number,
  "totalMin": number,
  "difficulty": "קל" | "בינוני" | "מתקדם",
  "category": "string | null — בוקר/צהריים/ערב/קינוח וכו'",
  "ingredients": [{ "name": "string", "amount": number, "unit": "string" }],
  "steps": [{ "text": "string", "timerSec": number | null }],
  "tags": ["string"]
}

כללים:
1. תרגם את שם המתכון, התיאור, המצרכים וההוראות לעברית אם המקור באנגלית.
2. לכל מצרך החזר כמות מספרית. אם הכמות "לפי הטעם" — החזר 1 ויחידה "לפי טעם".
3. עבור כל שלב הוראות, אם מוזכר זמן בישול — חלץ אותו ל-timerSec בשניות.
4. אל תכלול שום טקסט מחוץ ל-JSON.
5. אם לא הצלחת לחלץ מתכון תקף — החזר {"error": "סיבה קצרה בעברית"}.`;

function stripHtmlNoise(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Common Anthropic helpers ──────────────────────────────────────────────────
function isObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

async function runInsight(
  client: Anthropic,
  systemPrompt: string,
  userPayload: string,
  userPrefix: string,
  res: VercelResponse,
): Promise<void> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 240,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `${userPrefix}\n\n${userPayload}` }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text).join("").trim();
    if (!text) {
      res.status(502).json({ error: "Empty insight returned" });
      return;
    }
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.status(200).json({
      insight: text.length > 1200 ? text.slice(0, 1200) : text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_read_tokens: response.usage.cache_read_input_tokens ?? 0,
        cache_creation_tokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    sendAnthropicError(err, res);
  }
}

function sendAnthropicError(err: unknown, res: VercelResponse): void {
  const status =
    err instanceof Anthropic.RateLimitError ? 429
    : err instanceof Anthropic.AuthenticationError ? 401
    : err instanceof Anthropic.BadRequestError ? 400
    : err instanceof Anthropic.APIError ? err.status ?? 502
    : 502;
  const message = err instanceof Error ? err.message : "Unknown error";
  res.status(status).json({ error: message, status });
}

// ── Router ────────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = pickApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: `ANTHROPIC_API_KEY is not configured. Server accepts one of: ${ACCEPTED_KEYS.join(", ")}.`,
    });
  }

  const type = typeof req.query.type === "string" ? req.query.type : "";
  const client = new Anthropic({ apiKey });

  if (type === "daily-insight") {
    const ctx = (req.body as { context?: unknown })?.context;
    if (!isObject(ctx)) return res.status(400).json({ error: "context must be an object" });
    const payload = formatDailyContext(ctx as DailyInsightContext);
    if (payload.length > 4000) return res.status(413).json({ error: "context too large" });
    return runInsight(client, DAILY_PROMPT, payload, "הנה הנתונים שלי להיום. כתוב לי פסקה אחת קצרה לפי הכללים:", res);
  }

  if (type === "health-insight") {
    const ctx = (req.body as { context?: unknown })?.context;
    if (!isObject(ctx)) return res.status(400).json({ error: "context must be an object" });
    const payload = formatHealthContext(ctx as HealthContext);
    if (payload.length > 4000) return res.status(413).json({ error: "context too large" });
    return runInsight(client, HEALTH_PROMPT, payload, "הנה נתוני הבריאות שלי. כתוב לי תובנה קצרה לפי הכללים:", res);
  }

  if (type === "parse-recipe-url") {
    const url = typeof (req.body as { url?: unknown })?.url === "string" ? ((req.body as { url: string }).url).trim() : "";
    if (!url || !isValidUrl(url)) return res.status(400).json({ error: "url חסר או לא תקין" });

    let html: string;
    try {
      const fetched = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AuroraBot/1.0; recipe-importer)",
          "Accept": "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!fetched.ok) return res.status(502).json({ error: `שגיאה בטעינת ה-URL (${fetched.status})` });
      html = await fetched.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return res.status(502).json({ error: `כשל בטעינת ה-URL: ${msg}` });
    }

    const cleaned = stripHtmlNoise(html);
    const truncated = cleaned.length > 24_000 ? cleaned.slice(0, 24_000) : cleaned;
    if (truncated.length < 200) return res.status(422).json({ error: "תוכן הדף קצר מדי או ריק" });

    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2400,
        system: [{ type: "text", text: RECIPE_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `URL: ${url}\n\nתוכן הדף (HTML מנוקה):\n\n${truncated}` }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text).join("").trim();
      let parsed: unknown;
      try {
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) throw new Error("no json");
        parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      } catch {
        return res.status(502).json({ error: "התשובה מהמודל לא חזרה בפורמט JSON תקין" });
      }
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        return res.status(422).json({ error: String((parsed as { error: unknown }).error) });
      }
      res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
      return res.status(200).json({
        recipe: parsed,
        sourceUrl: url,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          cache_read_tokens: response.usage.cache_read_input_tokens ?? 0,
          cache_creation_tokens: response.usage.cache_creation_input_tokens ?? 0,
        },
      });
    } catch (err) {
      return sendAnthropicError(err, res);
    }
  }

  return res.status(404).json({ error: `Unknown AI type: ${type}` });
}
