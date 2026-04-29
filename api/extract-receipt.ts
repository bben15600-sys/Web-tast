import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

// Reuses the same env-var aliases as /api/claude so deployments need
// to set the key only once.
const ACCEPTED_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_KEY",
  "ANTHROPIC_TOKEN",
  "CLAUDE_API_KEY",
  "CLAUDE_KEY",
  "CLAUDE_TOKEN",
] as const;

const SYSTEM_PROMPT = `אתה מחלץ נתונים מקבלות קנייה ישראליות.
בהינתן תמונה של קבלה, החזר JSON בלבד (ללא markdown, ללא טקסט חופשי) במבנה הבא:

{
  "name": string,              // שם העסק בעברית (ללא כתובת/סניף)
  "amount": number,             // סכום כולל ששולם בש"ח, מספר חיובי, ללא סימן מטבע
  "date": string,               // תאריך ISO "YYYY-MM-DD". אם לא ברור — היום
  "paymentMethod": string|null, // אחד מ: "אשראי" | "מזומן" | "Apple Pay" | "ביט" | "העברה" | null
  "categoryHint": string|null,  // רמז לקטגוריה בעברית, למשל: "סופר","אוכל ובילויים","דלק","רכב","קניות","בריאות","בית","חשבונות","אחר", או null
  "notes": string|null,         // הערות קצרות כמו שם סניף או פירוט — או null
  "confidence": number          // ביטחון של 0.0 עד 1.0 בקריאה; 1.0 אם הכל ברור, 0.5 אם יש ספק
}

חוקים:
- אם הקבלה לא קריאה או זו לא קבלה — החזר: {"error":"not_a_receipt"}
- אל תמציא סכום. אם אי אפשר לקרוא את הסכום — החזר confidence נמוך
- הסכום חייב להיות מספר (לא מחרוזת) — 145.9, לא "145.9"
- החזר רק את ה-JSON, שום דבר אחר`;

type ReceiptExtraction = {
  name?: string;
  amount?: number;
  date?: string;
  paymentMethod?: string | null;
  categoryHint?: string | null;
  notes?: string | null;
  confidence?: number;
  error?: string;
};

function resolveApiKey(): string | null {
  const acceptedUpper = new Set(ACCEPTED_KEYS.map((k) => k.toUpperCase()));
  for (const [name, value] of Object.entries(process.env)) {
    if (acceptedUpper.has(name.toUpperCase()) && typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error:
        "ANTHROPIC_API_KEY לא מוגדר בשרת. הוסף אותו בהגדרות הדיפלוי ותעשה Redeploy.",
    });
  }

  const { image, mimeType } = (req.body ?? {}) as {
    image?: unknown;
    mimeType?: unknown;
  };
  if (typeof image !== "string" || image.length === 0) {
    return res.status(400).json({
      error: "image חייב להיות מחרוזת base64 של תמונה (ללא data:... prefix)",
    });
  }
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const mt = typeof mimeType === "string" && allowedTypes.has(mimeType) ? mimeType : "image/jpeg";

  // Rough size guard — Anthropic's per-image limit is ~5MB. Base64 is
  // 4/3 the size of the raw bytes, so 7MB of b64 ≈ 5.25MB raw.
  if (image.length > 7 * 1024 * 1024) {
    return res.status(413).json({
      error: "התמונה גדולה מדי (מקסימום ~5MB). צלם שוב ברזולוציה נמוכה יותר.",
    });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mt as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: image },
            },
            { type: "text", text: "חלץ את נתוני הקבלה ממה שיש בתמונה. החזר JSON בלבד." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(502).json({ error: "Claude החזיר תגובה ללא טקסט" });
    }
    const raw = textBlock.text.trim();

    // Claude sometimes wraps JSON in ```json ... ``` even when told not to.
    // Strip any code fence around the response.
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: ReceiptExtraction;
    try {
      parsed = JSON.parse(cleaned) as ReceiptExtraction;
    } catch {
      return res.status(502).json({
        error: "Claude לא החזיר JSON תקין",
        rawResponse: cleaned.slice(0, 300),
      });
    }

    if (parsed.error === "not_a_receipt") {
      return res.status(422).json({
        error: "התמונה לא נראית כמו קבלה. צלם את הקבלה שוב בתאורה טובה.",
      });
    }

    return res.status(200).json({
      ok: true,
      extracted: parsed,
      usage: response.usage,
    });
  } catch (err) {
    const status =
      err instanceof Anthropic.AuthenticationError ? 401
      : err instanceof Anthropic.RateLimitError ? 429
      : err instanceof Anthropic.BadRequestError ? 400
      : err instanceof Anthropic.APIError ? err.status ?? 502
      : 502;
    const message = err instanceof Error ? err.message : "Unknown error";
    const isLowCredit = /credit balance is too low/i.test(message);

    const friendly =
      isLowCredit
        ? "אין מספיק credits ב-Anthropic. היכנס ל-console.anthropic.com/settings/billing והוסף credits."
        : status === 401
          ? "מפתח Anthropic שגוי או לא פעיל."
          : status === 429
            ? "חרגנו ממגבלת הקצב של Anthropic. נסה שוב בעוד כמה שניות."
            : `שגיאה בקריאה ל-Claude (${status}): ${message}`;

    return res.status(status).json({ error: friendly, status });
  }
}
