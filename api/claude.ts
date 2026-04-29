import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

// Accepted env var names for the user's Anthropic API key. Matched
// case-insensitively so `anthropic_api_key`, `ANTHROPIC_API_KEY`,
// `claude_api_key` etc. all work.
const ACCEPTED_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_KEY",
  "ANTHROPIC_TOKEN",
  "CLAUDE_API_KEY",
  "CLAUDE_KEY",
  "CLAUDE_TOKEN",
] as const;

// Frontend model ids → canonical Anthropic model aliases.
// All models use `thinking: {type: "adaptive"}`; sampling params are
// stripped for Opus 4.7 per its API contract.
const MODEL_MAP: Record<string, string> = {
  "claude-opus-4-7":   "claude-opus-4-7",
  "claude-opus-4-6":   "claude-opus-4-6",
  "claude-sonnet-4-6": "claude-sonnet-4-6",
  "claude-haiku-4-5":  "claude-haiku-4-5",
  "claude-opus-4-5":   "claude-opus-4-5",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
};

const HEBREW_RULES =
  "כללי ברזל (חובה):\n" +
  "1. ענה תמיד בעברית. רק אם המשתמש כתב באנגלית — ענה באנגלית.\n" +
  "2. ענה ישירות על השאלה. אל תחזור על הנתונים שקיבלת, אל תצטט אותם גולמי.\n" +
  "3. ענה קצר וממוקד. 1-3 משפטים לשאלה פשוטה.\n" +
  "4. אם שאלה לא קשורה לנתונים (\"מה השעה\", \"שלום\") — ענה בשיחה רגילה.\n" +
  "5. אם השאלה דורשת מספר שלא נמצא בנתונים — אמור שאין לך את הנתון, אל תמציא.";

const SYSTEM_PROMPTS = {
  general:
    "אתה Claude — עוזר אישי של משתמש ישראלי שמנהל דשבורד חיים (לוז, תקציב, יעדים, השקעות). " +
    HEBREW_RULES,
  code:
    "אתה Claude — עוזר קוד לפרויקט Vite + React + TypeScript + Tailwind (shadcn/ui). " +
    "ענה בעברית; מונחי קוד באנגלית. Markdown + code blocks קצרים וממוקדים. " +
    HEBREW_RULES,
  chef:
    "אתה שף מקצועי ששיחת בעברית, מתמחה במטבח ישראלי, מזרחי וביתי, עם ניסיון בבישול לכמויות גדולות (צבא/מסיבות/שבתות). " +
    "עונה על שאלות טכניקה (למשל: \"איך מטגנים בצל שלא יישרף\"), תחליפי חומרים, תזמון בישול (\"הבצק צריך לתפוח 2 שעות, מתי להתחיל?\"), והמרות כמויות. " +
    "כשמבקשים מתכון — תן כמויות מדויקות (גרם/מ\"ל), זמני בישול, וטיפ טכני אחד חשוב. " +
    "כשמשנים לכמויות גדולות (מעל 20 מנות) — הזהר שמלח/חומצה/תבלינים אינם לינאריים; המלץ להתחיל מ-75% ולטעום. " +
    "במתכונים עם בצק/תפיחה — ציין בבירור מתי להתחיל כדי שיהיה מוכן בזמן. " +
    HEBREW_RULES,
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((m) => {
    if (!m || typeof m !== "object") return false;
    const r = (m as { role?: unknown }).role;
    const c = (m as { content?: unknown }).content;
    return (r === "user" || r === "assistant" || r === "system") && typeof c === "string";
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const acceptedUpper = new Set(ACCEPTED_KEYS.map((k) => k.toUpperCase()));
  const apiKey = Object.entries(process.env).find(([name, value]) =>
    acceptedUpper.has(name.toUpperCase()) && typeof value === "string" && value.length > 0,
  )?.[1];
  if (!apiKey) {
    return res.status(500).json({
      error:
        "ANTHROPIC_API_KEY is not configured on the server. " +
        `Server accepts one of: ${ACCEPTED_KEYS.join(", ")}. ` +
        "Get a key from console.anthropic.com → Settings → API Keys, " +
        "then add it on Vercel and redeploy.",
    });
  }

  const { messages, model, mode, context } = (req.body ?? {}) as {
    messages?: unknown;
    model?: unknown;
    mode?: unknown;
    context?: unknown;
  };

  if (!isChatMessageArray(messages)) {
    return res.status(400).json({ error: "messages must be a non-empty array of { role, content }" });
  }

  const modelKey = typeof model === "string" && model in MODEL_MAP ? model : "claude-haiku-4-5";
  const resolvedModel = MODEL_MAP[modelKey];
  const basePrompt =
    mode === "code" ? SYSTEM_PROMPTS.code
    : mode === "chef" ? SYSTEM_PROMPTS.chef
    : SYSTEM_PROMPTS.general;
  const contextBlock = typeof context === "string" && context.trim().length > 0
    ? `\n\nלהלן הנתונים העדכניים של המשתמש (השתמש בהם כדי לענות על שאלות ספציפיות; אל תמציא מספרים; אם המידע לא מופיע כאן, תגיד שאין לך את הנתון):\n${context.trim()}`
    : "";
  const systemPrompt = basePrompt + contextBlock;

  // Strip any accidental "system" role messages from the array — Anthropic's
  // messages endpoint takes system as a top-level string, not an entry in
  // messages[]. Everything else passes through role-preserved.
  const userAssistantMessages = messages.filter((m) => m.role !== "system");

  const client = new Anthropic({ apiKey });

  // Emit the streaming response in OpenAI-compatible SSE so the existing
  // client (src/pages/Chat.tsx) can parse both providers with one code path.
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const writeDelta = (text: string) => {
    const payload = JSON.stringify({
      choices: [{ delta: { content: text } }],
    });
    res.write(`data: ${payload}\n\n`);
  };

  try {
    const stream = client.messages.stream({
      model: resolvedModel,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: userAssistantMessages.map((m) => ({ role: m.role, content: m.content })),
    });

    req.on("close", () => {
      stream.controller.abort();
    });

    stream.on("text", (delta) => {
      writeDelta(delta);
    });

    await stream.finalMessage();
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    const status =
      err instanceof Anthropic.RateLimitError ? 429
      : err instanceof Anthropic.AuthenticationError ? 401
      : err instanceof Anthropic.BadRequestError ? 400
      : err instanceof Anthropic.NotFoundError ? 404
      : err instanceof Anthropic.APIError ? err.status ?? 502
      : 502;
    const message = err instanceof Error ? err.message : "Unknown error";
    // Anthropic packages several distinct billing-state errors as 400
    // invalid_request_error. Surface them as their own category rather
    // than showing the user raw JSON.
    const isLowCredit = /credit balance is too low/i.test(message);

    const friendly =
      isLowCredit
        ? "אין מספיק credits בחשבון Anthropic. היכנס ל-console.anthropic.com/settings/billing, הוסף credits (מינימום $5), וחכה 10-30 שניות שהיתרה תתעדכן. שווה להפעיל Auto-reload."
        : status === 401
          ? "מפתח Anthropic שגוי או לא פעיל. ודא את ה-ANTHROPIC_API_KEY ב-Vercel."
          : status === 429
            ? "חרגת ממגבלת הקצב של Anthropic. נסה שוב בעוד דקה, או שדרג את ה-tier בקונסולה."
            : status === 400
              ? `בקשה לא תקינה ל-Claude: ${message}`
              : status === 404
                ? "מודל Claude שנבחר לא קיים או לא זמין לחשבון שלך."
                : `שגיאה בקריאה ל-Claude (${status}): ${message}`;

    if (!res.headersSent) {
      return res.status(status).json({ error: friendly, status });
    }
    // Headers already sent (mid-stream). Emit an error delta and close.
    writeDelta(`\n\n⚠️ ${friendly}`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
}
