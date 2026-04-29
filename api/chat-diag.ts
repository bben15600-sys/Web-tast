import type { VercelRequest, VercelResponse } from "@vercel/node";

// Combined diagnostic endpoint for the /api/chat OpenRouter integration.
// Routes via ?check=env|models. vercel.json rewrites the original URLs:
//   /api/chat-env-check    → /api/chat-diag?check=env
//   /api/chat-models-check → /api/chat-diag?check=models
// Consolidating into one file keeps us under Vercel's Hobby-tier
// 12-function deployment limit.

// ── env check ────────────────────────────────────────────────────────────────
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

function envCheck(_req: VercelRequest, res: VercelResponse) {
  const acceptedUpper = new Set(ACCEPTED_KEYS.map((k) => k.toUpperCase()));
  const presentByUpper = new Map<string, string>();
  for (const name of Object.keys(process.env)) {
    const upper = name.toUpperCase();
    const value = process.env[name];
    if (acceptedUpper.has(upper) && typeof value === "string" && value.length > 0) {
      presentByUpper.set(upper, name);
    }
  }
  const accepted = ACCEPTED_KEYS.map((name) => ({
    name,
    present: presentByUpper.has(name.toUpperCase()),
    resolvedAs: presentByUpper.get(name.toUpperCase()) ?? null,
  }));
  const firstPresent = accepted.find((k) => k.present);
  const relatedPattern = /OPENROUTER|CHATBOT|CHAT_?BOT|OPENAI|LLM|ANTHROPIC|AI[_-]?KEY|STRAVA|TWELVE|FINNHUB|NOTION/i;
  const otherDetectedNames = Object.keys(process.env)
    .filter((k) => relatedPattern.test(k))
    .filter((k) => !acceptedUpper.has(k.toUpperCase()));
  return res.status(200).json({
    ok: firstPresent != null,
    resolvedFrom: firstPresent?.resolvedAs ?? null,
    accepted,
    otherDetectedNames,
    hint:
      firstPresent != null
        ? `Server will use this key for /api/chat (matched ${firstPresent.resolvedAs}).`
        : otherDetectedNames.length > 0
          ? `No accepted key is set, but these related vars exist: ${otherDetectedNames.join(", ")}. Rename one to OPENROUTER_API_KEY (or CHATBOT_KEY) and redeploy.`
          : "No OpenRouter-related env var is visible to this function. Confirm the var is set for the PRODUCTION environment in Vercel, then REDEPLOY from Deployments → ⋯ → Redeploy.",
  });
}

// ── models check ─────────────────────────────────────────────────────────────
const CATALOG_URL = "https://openrouter.ai/api/v1/models";
const TRACKED_SLUGS = [
  "openrouter/auto",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.0-flash-thinking-exp:free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
  "google/gemma-2-9b-it:free",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.5",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
] as const;

type ModelInfo = { id: string; pricing?: { prompt?: string; completion?: string } };

async function modelsCheck(_req: VercelRequest, res: VercelResponse) {
  try {
    const upstream = await fetch(CATALOG_URL, { headers: { "User-Agent": "oslife/chat-diag" } });
    if (!upstream.ok) {
      return res.status(502).json({ ok: false, error: `OpenRouter catalog returned ${upstream.status}` });
    }
    const payload = (await upstream.json()) as { data?: ModelInfo[] };
    const catalog = new Map<string, ModelInfo>();
    for (const m of payload.data ?? []) {
      if (m?.id) catalog.set(m.id, m);
    }
    const statuses = TRACKED_SLUGS.map((slug) => {
      const hit = catalog.get(slug);
      if (!hit) return { slug, present: false };
      const promptCost = Number(hit.pricing?.prompt ?? 0);
      const completionCost = Number(hit.pricing?.completion ?? 0);
      return {
        slug,
        present: true,
        free: promptCost === 0 && completionCost === 0,
        pricing: hit.pricing ?? null,
      };
    });
    const missing = statuses.filter((s) => !s.present).map((s) => s.slug);
    const workingFree = statuses
      .filter((s) => s.present && "free" in s && s.free)
      .map((s) => s.slug);
    const allFreeInCatalog: string[] = [];
    for (const [id, info] of catalog) {
      const p = Number(info.pricing?.prompt ?? 0);
      const c = Number(info.pricing?.completion ?? 0);
      if (p === 0 && c === 0) allFreeInCatalog.push(id);
    }
    allFreeInCatalog.sort();
    return res.status(200).json({
      ok: true,
      catalogSize: catalog.size,
      statuses,
      summary: { missingFromCatalog: missing, workingFreeModels: workingFree, allFreeInCatalog },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const check = typeof req.query.check === "string" ? req.query.check : "";
  if (check === "env") return envCheck(req, res);
  if (check === "models") return modelsCheck(req, res);
  return res.status(404).json({ error: "Use ?check=env or ?check=models" });
}
