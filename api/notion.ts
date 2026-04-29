import type { VercelRequest, VercelResponse } from "@vercel/node";

const NOTION_API = "https://api.notion.com/v1";
const UUID_REGEX = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

type Body = {
  databaseId?: unknown;
  filter?: unknown;
  sorts?: unknown;
  page_size?: unknown;
  start_cursor?: unknown;
  integration?: unknown;
};

type IntegrationConfig = {
  tokenVar: string;
  version: string;
  buildQueryUrl: (id: string) => string;
};

// Per-integration routing. The "mm" integration queries the Notion 2025-09-03
// `/data_sources/{id}/query` endpoint — Money Master's DBs are multi-source
// wrappers whose UUIDs refer to data sources, not the legacy `database_id`.
const INTEGRATIONS: Record<string, IntegrationConfig> = {
  default: {
    tokenVar: "NOTION_API_TOKEN",
    version: "2022-06-28",
    buildQueryUrl: (id) => `${NOTION_API}/databases/${id}/query`,
  },
  mm: {
    tokenVar: "NOTION_MM_API_TOKEN",
    version: "2025-09-03",
    buildQueryUrl: (id) => `${NOTION_API}/data_sources/${id}/query`,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { databaseId, filter, sorts, page_size, start_cursor, integration } =
    (req.body ?? {}) as Body;

  const integrationId =
    typeof integration === "string" && integration in INTEGRATIONS
      ? integration
      : "default";
  const config = INTEGRATIONS[integrationId];
  // Prefer the integration-specific token, but fall back to NOTION_API_TOKEN
  // if it isn't set. Supports the common case where the user consolidated
  // multiple Notion integrations into one and only keeps the main token.
  const token = process.env[config.tokenVar] ?? process.env.NOTION_API_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: `${config.tokenVar} (and NOTION_API_TOKEN fallback) are not configured on the server`,
      integration: integrationId,
    });
  }

  if (typeof databaseId !== "string" || !UUID_REGEX.test(databaseId)) {
    // Don't echo the received value — an attacker probing the endpoint
    // shouldn't get back a partial ID they can pivot on.
    return res.status(400).json({
      error: "Invalid or missing databaseId",
      receivedType: typeof databaseId,
      hint: "databaseId must be a Notion UUID (hex 32 chars or with hyphens). Check the VITE_NOTION_*_DB_ID env var in Vercel.",
    });
  }

  const allowlist = process.env.NOTION_ALLOWED_DATABASES;
  if (allowlist) {
    const normalize = (s: string) => s.replace(/-/g, "").toLowerCase();
    const allowed = allowlist.split(",").map((s) => normalize(s.trim())).filter(Boolean);
    if (!allowed.includes(normalize(databaseId))) {
      return res.status(403).json({ error: "Database is not in the allowlist" });
    }
  }

  const forwarded: Record<string, unknown> = {};
  if (filter && typeof filter === "object") forwarded.filter = filter;
  if (Array.isArray(sorts)) forwarded.sorts = sorts;
  if (typeof page_size === "number") forwarded.page_size = Math.min(page_size, 100);
  if (typeof start_cursor === "string") forwarded.start_cursor = start_cursor;

  try {
    const upstream = await fetch(config.buildQueryUrl(databaseId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": config.version,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forwarded),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: "Notion API request failed", message });
  }
}
