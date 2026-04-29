import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const ACCEPTED_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_KEY",
  "ANTHROPIC_TOKEN",
  "CLAUDE_API_KEY",
  "CLAUDE_KEY",
  "CLAUDE_TOKEN",
] as const;

const SYSTEM_PROMPT = `אתה מחלץ הוצאה ממשפט חופשי בעברית שהמשתמש הקריא.
דוגמאות קלט:
- "הוצאתי 50 שקל על קפה ברמזור"
- "קניתי סנדביץ' ב-32 שקלים ב-Apple Pay"
- "נלקחו 180 ש״ח מהחשבון לסופר"
- "שילמתי ביט 200 לחברה לתקשורת"

החזר JSON בלבד (ללא markdown) במבנה:
{
  "name": string,              // שם קצר וברור של העסק/המוצר בעברית (1-4 מילים)
  "amount": number,             // סכום בשקלים, מספר חיובי
  "date": string,               // "YYYY-MM-DD" — אם המשתמש אמר "אתמול"/"היום"/"בשבת" חשב; אחרת היום
  "paymentMethod": string|null, // "אשראי" | "מזומן" | "Apple Pay" | "ביט" | "העברה" | null
  "categoryHint": string|null,  // רמז קטגוריה: "סופר","אוכל ובילויים","דלק","רכב","קניות","בריאות","בית","חשבונות","אחר"
  "notes": string|null,         // הערות רלוונטיות או null
  "confidence": number          // 0.0-1.0; 1.0 אם הכל ברור
}

אם לא הצלחת להבין את הסכום — החזר: {"error":"cant_parse"}
החזר רק את ה-JSON.`;

type ExpenseExtraction = {
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

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY לא מוגדר בשרת. הוסף אותו ועשה Redeploy.",
    });
  }

  const { transcript } = (req.body ?? {}) as { transcript?: unknown };
  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return res.status(400).json({ error: "transcript חייב להיות מחרוזת לא ריקה" });
  }
  if (transcript.length > 1000) {
    return res.status(413).json({ error: "transcript ארוך מדי (מעל 1000 תווים)" });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      // Haiku is fast, cheap, and more than capable of this simple extraction.
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `קלט: "${transcript.trim()}"\nתאריך היום: ${todayISO()}\nהחזר JSON.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(502).json({ error: "Claude החזיר תגובה ללא טקסט" });
    }
    const cleaned = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: ExpenseExtraction;
    try {
      parsed = JSON.parse(cleaned) as ExpenseExtraction;
    } catch {
      return res.status(502).json({
        error: "Claude לא החזיר JSON תקין",
        rawResponse: cleaned.slice(0, 200),
      });
    }

    if (parsed.error === "cant_parse") {
      return res.status(422).json({
        error: "לא הצלחתי להבין את ההוצאה מההקלטה. נסה שוב בצורה יותר ברורה (\"הוצאתי 50 שקל על קפה\").",
      });
    }

    return res.status(200).json({ ok: true, extracted: parsed, usage: response.usage });
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
        ? "אין מספיק credits ב-Anthropic. היכנס ל-console.anthropic.com/settings/billing."
        : status === 401
          ? "מפתח Anthropic שגוי או לא פעיל."
          : status === 429
            ? "חרגנו ממגבלת הקצב של Anthropic. נסה שוב בעוד כמה שניות."
            : `שגיאה בקריאה ל-Claude (${status}): ${message}`;

    return res.status(status).json({ error: friendly, status });
  }
}
