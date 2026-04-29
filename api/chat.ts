import type { VercelRequest, VercelResponse } from "@vercel/node";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Map the frontend model ids to OpenRouter model slugs.
// Keep backwards-compatible aliases so older chat sessions stored in
// localStorage still resolve to a sensible model after an id rename.
const MODEL_MAP: Record<string, string> = {
  // Smart routing
  auto: "openrouter/auto",

  // Free tier
  "qwen3-coder-free":     "qwen/qwen3-coder:free",
  "gemini-free":          "google/gemini-2.0-flash-exp:free",
  "gemini-thinking-free": "google/gemini-2.0-flash-thinking-exp:free",
  "deepseek-r1-free":     "deepseek/deepseek-r1:free",
  "llama-free":           "meta-llama/llama-3.3-70b-instruct:free",

  // Paid — cheap
  haiku:         "anthropic/claude-haiku-4.5",
  "gemini-flash":"google/gemini-2.5-flash",
  "gpt-5-mini":  "openai/gpt-5-mini",
  "gpt-4o-mini": "openai/gpt-4o-mini",

  // Paid — premium
  sonnet:        "anthropic/claude-sonnet-4.5",
  "gpt-5":       "openai/gpt-5",
  "gemini-pro":  "google/gemini-2.5-pro",
  "gpt-4o":      "openai/gpt-4o",

  // Paid — top
  opus:          "anthropic/claude-opus-4.5",

  // Backwards-compat: older UI used these ids. Point them at the
  // closest current equivalent so old localStorage sessions don't
  // break or quietly fall back to 'auto'.
  free:   "google/gemini-2.0-flash-exp:free",
  gemini: "google/gemini-2.5-flash",
};

// Tried in order when the user's primary choice fails with 402/404/429/5xx.
// Ordered roughly by quality; mixes providers so a single-provider outage
// or rate-limit doesn't take down the whole chain. OpenRouter rotates
// :free slugs, so we don't rely on any one of them surviving forever.
const FREE_FALLBACK_CHAIN: string[] = [
  "qwen/qwen3-coder:free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

const HEBREW_RULES =
  "כללי ברזל (חובה):\n" +
  "1. ענה תמיד בעברית. רק אם המשתמש כתב באנגלית — ענה באנגלית.\n" +
  "2. ענה ישירות על השאלה. אל תחזור על הנתונים שקיבלת, אל תצטט אותם גולמי ואל תתחיל במשפטים כמו \"לפי הנתונים שניתנו…\".\n" +
  "3. ענה קצר וממוקד. 1-3 משפטים לשאלה פשוטה.\n" +
  "4. אם שאלה לא קשורה לנתונים (\"מה השעה\", \"שלום\") — ענה בשיחה רגילה, בלי להזכיר נתוני תקציב או שוק.\n" +
  "5. אם השאלה דורשת מספר שלא נמצא בנתונים — אמור שאין לך את הנתון, אל תמציא.";

const SYSTEM_PROMPTS = {
  general:
    "אתה עוזר אישי של משתמש ישראלי שמנהל דשבורד חיים (לוז, תקציב, יעדים, השקעות). " +
    HEBREW_RULES,
  code:
    "אתה עוזר קוד לפרויקט Vite + React + TypeScript + Tailwind (shadcn/ui). " +
    "ענה בעברית; מונחי קוד באנגלית זה תקין. Markdown + code blocks קצרים וממוקדים. " +
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

  // Accept a handful of common env var names so the integration works
  // regardless of what the operator called the key in their host's
  // environment settings. `OPENROUTER_API_KEY` is the canonical one.
  // Match case-insensitively: Vercel preserves the exact casing the
  // operator typed, so `chatbot_key` and `CHATBOT_KEY` both count.
  const ACCEPTED_KEYS = [
    "OPENROUTER_API_KEY",
    "OPENROUTER_KEY",
    "OPENROUTER_TOKEN",
    "OPENROUTER_CHATBOT",
    "CHATBOT_KEY",
    "CHAT_BOT_KEY",
    "CHATBOT",
    "CHAT_BOT",
  ] as const;
  const acceptedSet = new Set(ACCEPTED_KEYS.map((k) => k.toUpperCase()));
  const apiKey = Object.entries(process.env).find(([name, value]) =>
    acceptedSet.has(name.toUpperCase()) && typeof value === "string" && value.length > 0,
  )?.[1];
  if (!apiKey) {
    const presentNames = Object.keys(process.env).filter((k) =>
      /OPENROUTER|CHATBOT|CHAT_BOT|OPENAI|LLM|AI_KEY/i.test(k),
    );
    return res.status(500).json({
      error:
        "OPENROUTER_API_KEY is not configured on the server. " +
        `Server accepts one of: ${ACCEPTED_KEYS.join(", ")}.` +
        (presentNames.length > 0
          ? ` Detected similar-looking env vars in this deployment: ${presentNames.join(", ")}.`
          : " No similar env vars are present — add one and redeploy."),
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

  const modelKey = typeof model === "string" && model in MODEL_MAP ? model : "auto";
  const resolvedModel = MODEL_MAP[modelKey];
  const basePrompt = mode === "code" ? SYSTEM_PROMPTS.code : SYSTEM_PROMPTS.general;
  const contextBlock = typeof context === "string" && context.trim().length > 0
    ? `\n\nלהלן הנתונים העדכניים של המשתמש (השתמש בהם כדי לענות על שאלות ספציפיות; אל תמציא מספרים; אם המידע לא מופיע כאן, תגיד שאין לך את הנתון):\n${context.trim()}`
    : "";
  const systemPrompt = basePrompt + contextBlock;

  const callUpstream = async (slug: string) => fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://oslife.app",
      "X-Title": "oslife",
    },
    body: JSON.stringify({
      model: slug,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  // Status codes worth retrying on a different free model:
  //   402 — insufficient credits on the user's picked paid model
  //   404 — slug retired / unavailable
  //   429 — rate limit (OpenRouter's free tier is aggressively throttled)
  //   5xx — transient upstream error
  const shouldFallback = (status: number) =>
    status === 402 || status === 404 || status === 429 || status >= 500;

  try {
    let upstream = await callUpstream(resolvedModel);
    if (shouldFallback(upstream.status)) {
      const tried = new Set<string>([resolvedModel]);
      for (const candidate of FREE_FALLBACK_CHAIN) {
        if (tried.has(candidate)) continue;
        tried.add(candidate);
        // Small delay so we don't cascade into the same rate-limit
        // window that just tripped us.
        await new Promise((r) => setTimeout(r, 250));
        const retry = await callUpstream(candidate);
        if (retry.ok && retry.body) {
          upstream = retry;
          break;
        }
        upstream = retry;
        if (!shouldFallback(retry.status)) break;
      }
    }

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      // Translate the most common OpenRouter failures into actionable
      // Hebrew so the chat bubble isn't a bare "request failed".
      const friendly =
        upstream.status === 429
          ? "המודלים החינמיים מוצו להיום (Rate limit). אם יש לך credits — בחר \"Claude Haiku 4.5\" מקטגוריית \"זול\" בבורר המודלים (~$0.001 להודעה, ללא הגבלות). אם לא — המתן כדקה או טען credits ב-openrouter.ai/credits."
          : upstream.status === 402
            ? "לחשבון ה-OpenRouter שלך אין credits. הוסף credits ב-openrouter.ai/credits ובחר \"Claude Haiku 4.5\" מקטגוריית \"זול\"."
            : upstream.status === 404
              ? "המודל הנבחר לא זמין יותר ב-OpenRouter. בחר מודל אחר מהתפריט — \"Claude Haiku 4.5\" זול ואמין."
              : upstream.status >= 500
                ? "שרת OpenRouter חווה בעיה זמנית. נסה שוב בעוד כמה שניות."
                : null;
      return res.status(upstream.status || 502).json({
        error: friendly ?? "OpenRouter request failed",
        status: upstream.status,
        detail: detail.slice(0, 500),
      });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    req.on("close", () => {
      reader.cancel().catch(() => undefined);
    });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (!res.headersSent) {
      return res.status(502).json({ error: "Upstream request failed", message });
    }
    res.end();
  }
}
