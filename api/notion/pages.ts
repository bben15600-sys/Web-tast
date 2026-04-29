import type { VercelRequest, VercelResponse } from "@vercel/node";

const NOTION_API = "https://api.notion.com/v1";
const UUID_REGEX = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

type IntegrationConfig = {
  tokenVar: string;
  version: string;
  parentField: "database_id" | "data_source_id";
};

const INTEGRATIONS: Record<string, IntegrationConfig> = {
  default: {
    tokenVar: "NOTION_API_TOKEN",
    version: "2022-06-28",
    parentField: "database_id",
  },
  mm: {
    tokenVar: "NOTION_MM_API_TOKEN",
    version: "2025-09-03",
    parentField: "data_source_id",
  },
};

type Body = {
  action?: unknown;
  integration?: unknown;
  databaseId?: unknown;
  pageId?: unknown;
  properties?: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = (req.body ?? {}) as Body;
  const action = body.action;
  if (action !== "create" && action !== "update" && action !== "archive") {
    return res.status(400).json({ error: "action must be 'create' | 'update' | 'archive'" });
  }

  const integrationId =
    typeof body.integration === "string" && body.integration in INTEGRATIONS
      ? body.integration
      : "default";
  const config = INTEGRATIONS[integrationId];
  const token = process.env[config.tokenVar] ?? process.env.NOTION_API_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: `${config.tokenVar} (and NOTION_API_TOKEN fallback) not configured`,
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": config.version,
    "Content-Type": "application/json",
  };

  try {
    if (action === "create") {
      if (typeof body.databaseId !== "string" || !UUID_REGEX.test(body.databaseId)) {
        return res.status(400).json({
          error: "Invalid or missing databaseId",
          received: typeof body.databaseId === "string" ? body.databaseId.slice(0, 60) : typeof body.databaseId,
        });
      }
      if (!body.properties || typeof body.properties !== "object") {
        return res.status(400).json({ error: "properties required for create" });
      }
      const upstream = await fetch(`${NOTION_API}/pages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { [config.parentField]: body.databaseId },
          properties: body.properties,
        }),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    if (action === "update") {
      if (typeof body.pageId !== "string" || !UUID_REGEX.test(body.pageId)) {
        return res.status(400).json({ error: "Invalid or missing pageId" });
      }
      if (!body.properties || typeof body.properties !== "object") {
        return res.status(400).json({ error: "properties required for update" });
      }
      const upstream = await fetch(`${NOTION_API}/pages/${body.pageId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ properties: body.properties }),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    // archive
    if (typeof body.pageId !== "string" || !UUID_REGEX.test(body.pageId)) {
      return res.status(400).json({ error: "Invalid or missing pageId" });
    }
    const upstream = await fetch(`${NOTION_API}/pages/${body.pageId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ archived: true }),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: "Notion API request failed", message });
  }
}
