export type NotionRichText = {
  plain_text: string;
  href: string | null;
};

export type NotionFormulaValue =
  | { type: "string"; string: string | null }
  | { type: "number"; number: number | null }
  | { type: "boolean"; boolean: boolean | null }
  | { type: "date"; date: { start: string; end: string | null } | null };

export type NotionRollupValue =
  | { type: "number"; number: number | null; function?: string }
  | { type: "date"; date: { start: string; end: string | null } | null; function?: string }
  | { type: "array"; array: unknown[]; function?: string };

export type NotionProperty =
  | { type: "title"; title: NotionRichText[] }
  | { type: "rich_text"; rich_text: NotionRichText[] }
  | { type: "date"; date: { start: string; end: string | null; time_zone: string | null } | null }
  | { type: "select"; select: { name: string; color: string } | null }
  | { type: "multi_select"; multi_select: Array<{ name: string; color: string }> }
  | { type: "number"; number: number | null }
  | { type: "checkbox"; checkbox: boolean }
  | { type: "url"; url: string | null }
  | { type: "relation"; relation: Array<{ id: string }>; has_more?: boolean }
  | { type: "formula"; formula: NotionFormulaValue }
  | { type: "rollup"; rollup: NotionRollupValue }
  | { type: "created_time"; created_time: string }
  | { type: "last_edited_time"; last_edited_time: string };

export type NotionPage = {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, NotionProperty>;
};

export type NotionQueryResponse = {
  object: "list";
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
};

export type NotionIntegration = "default" | "mm";

export type NotionQueryRequest = {
  databaseId: string;
  integration?: NotionIntegration;
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
  page_size?: number;
  start_cursor?: string;
};

export async function queryNotionDatabase(
  request: NotionQueryRequest,
  signal?: AbortSignal,
): Promise<NotionQueryResponse> {
  const response = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      `Notion request failed (${response.status})`;
    throw new Error(message);
  }
  return data as NotionQueryResponse;
}

export function extractTitle(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== "title") return "";
  return prop.title.map((t) => t.plain_text).join("");
}

export function extractRichText(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== "rich_text") return "";
  return prop.rich_text.map((t) => t.plain_text).join("");
}

export function extractDate(
  prop: NotionProperty | undefined,
): { start: string; end: string | null } | null {
  if (!prop || prop.type !== "date" || !prop.date) return null;
  return { start: prop.date.start, end: prop.date.end };
}

export function extractSelect(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== "select") return null;
  return prop.select?.name ?? null;
}

export function extractNumber(prop: NotionProperty | undefined): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number;
}

export function extractMultiSelect(prop: NotionProperty | undefined): string[] {
  if (!prop || prop.type !== "multi_select") return [];
  return prop.multi_select.map((o) => o.name);
}

export function extractCheckbox(prop: NotionProperty | undefined): boolean {
  if (!prop || prop.type !== "checkbox") return false;
  return prop.checkbox;
}

export function extractRelation(prop: NotionProperty | undefined): string[] {
  if (!prop || prop.type !== "relation") return [];
  return prop.relation.map((r) => r.id);
}

export function extractFormulaNumber(prop: NotionProperty | undefined): number | null {
  if (!prop || prop.type !== "formula") return null;
  if (prop.formula.type !== "number") return null;
  return prop.formula.number;
}

export function extractFormulaString(prop: NotionProperty | undefined): string {
  if (!prop || prop.type !== "formula") return "";
  if (prop.formula.type !== "string") return "";
  return prop.formula.string ?? "";
}

export function extractRollupNumber(prop: NotionProperty | undefined): number | null {
  if (!prop || prop.type !== "rollup") return null;
  if (prop.rollup.type !== "number") return null;
  return prop.rollup.number;
}

// ── Write helpers (create / update / archive pages) ──────────────────────────

type WriteBase = { integration?: NotionIntegration };

async function mutateNotionPage(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch("/api/notion/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (typeof (data as { message?: unknown })?.message === "string" && (data as { message: string }).message) ||
      (typeof (data as { error?: unknown })?.error === "string" && (data as { error: string }).error) ||
      `Notion write failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export function createNotionPage(
  params: WriteBase & { databaseId: string; properties: Record<string, unknown> },
  signal?: AbortSignal,
): Promise<unknown> {
  return mutateNotionPage({ action: "create", ...params }, signal);
}

export function updateNotionPage(
  params: WriteBase & { pageId: string; properties: Record<string, unknown> },
  signal?: AbortSignal,
): Promise<unknown> {
  return mutateNotionPage({ action: "update", ...params }, signal);
}

export function archiveNotionPage(
  params: WriteBase & { pageId: string },
  signal?: AbortSignal,
): Promise<unknown> {
  return mutateNotionPage({ action: "archive", ...params }, signal);
}
