import type { VercelRequest, VercelResponse } from "@vercel/node";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

type Range = "1mo" | "3mo" | "6mo" | "1y" | "ytd" | "5y";

const RANGE_CONFIG: Record<Range, { range: string; interval: string; finnhubResolution: string; days: number }> = {
  "1mo": { range: "1mo", interval: "1d",  finnhubResolution: "D", days: 35 },
  "3mo": { range: "3mo", interval: "1d",  finnhubResolution: "D", days: 95 },
  "6mo": { range: "6mo", interval: "1d",  finnhubResolution: "D", days: 190 },
  "1y":  { range: "1y",  interval: "1d",  finnhubResolution: "D", days: 370 },
  "ytd": { range: "ytd", interval: "1d",  finnhubResolution: "D", days: 370 },
  "5y":  { range: "5y",  interval: "1wk", finnhubResolution: "W", days: 1850 },
};

type ChartResult = {
  timestamp?: number[];
  indicators?: { quote?: Array<{ close?: Array<number | null> }> };
};

type ChartPoint = { date: string; close: number };

async function fetchChartFromYahooHost(host: "query1" | "query2", symbol: string, range: Range): Promise<ChartPoint[]> {
  const cfg = RANGE_CONFIG[range];
  const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}`;
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Yahoo(${host}) ${response.status}: ${text.slice(0, 80)}`);
  let data: { chart?: { result?: ChartResult[]; error?: { description?: string } } };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Yahoo(${host}) non-JSON: ${text.slice(0, 80)}`);
  }
  if (data.chart?.error?.description) throw new Error(data.chart.error.description);
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  return timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString(), close: closes[i] }))
    .filter((p): p is ChartPoint => typeof p.close === "number");
}

async function fetchChartFromYahoo(symbol: string, range: Range): Promise<ChartPoint[]> {
  // query1 is sometimes blocked on Vercel's IP range — fall back to query2.
  try {
    return await fetchChartFromYahooHost("query1", symbol, range);
  } catch (err) {
    return await fetchChartFromYahooHost("query2", symbol, range);
  }
}

type FinnhubCandles = { c?: number[]; t?: number[]; s?: string };

async function fetchChartFromFinnhub(symbol: string, range: Range, apiKey: string): Promise<ChartPoint[]> {
  const cfg = RANGE_CONFIG[range];
  const now = Math.floor(Date.now() / 1000);
  const from = now - cfg.days * 24 * 60 * 60;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${cfg.finnhubResolution}&from=${from}&to=${now}&token=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`Finnhub ${response.status}: ${text.slice(0, 80)}`);
  let data: FinnhubCandles;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Finnhub non-JSON: ${text.slice(0, 80)}`);
  }
  if (data.s !== "ok" || !Array.isArray(data.c) || !Array.isArray(data.t)) {
    throw new Error(`Finnhub: status ${data.s ?? "unknown"}`);
  }
  return data.t.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString(),
    close: data.c![i],
  }));
}

// Twelve Data — free tier 800 calls/day, 8/min. Generally reliable from
// cloud IPs (Yahoo blocks Vercel's range, but Twelve Data does not).
// Sign up at https://twelvedata.com/ to get an API key.
type TwelveDataResponse = {
  values?: Array<{ datetime: string; close: string }>;
  status?: string;
  message?: string;
};

const TWELVE_DATA_INTERVAL: Record<Range, string> = {
  "1mo": "1day",
  "3mo": "1day",
  "6mo": "1day",
  "1y":  "1day",
  "ytd": "1day",
  "5y":  "1week",
};

const TWELVE_DATA_OUTPUTSIZE: Record<Range, number> = {
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y":  365,
  "ytd": 365,
  "5y":  260,
};

async function fetchChartFromTwelveData(symbol: string, range: Range, apiKey: string): Promise<ChartPoint[]> {
  const interval = TWELVE_DATA_INTERVAL[range];
  const outputsize = TWELVE_DATA_OUTPUTSIZE[range];
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`TwelveData ${response.status}: ${text.slice(0, 80)}`);
  let data: TwelveDataResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`TwelveData non-JSON: ${text.slice(0, 80)}`);
  }
  if (data.status === "error") {
    throw new Error(`TwelveData: ${data.message ?? "unknown error"}`);
  }
  if (!Array.isArray(data.values) || data.values.length === 0) {
    throw new Error(`TwelveData: empty values`);
  }
  // TwelveData returns newest-first; we want oldest-first for the line chart.
  return data.values
    .map((row) => ({
      date: new Date(`${row.datetime}T00:00:00Z`).toISOString(),
      close: Number(row.close),
    }))
    .filter((p) => Number.isFinite(p.close))
    .reverse();
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbol = typeof req.query.symbol === "string" ? req.query.symbol.trim() : "";
  if (!symbol) {
    return res.status(400).json({ error: "symbol query parameter is required" });
  }
  const rangeParam = typeof req.query.range === "string" ? req.query.range : "3mo";
  const range = (rangeParam in RANGE_CONFIG ? rangeParam : "3mo") as Range;

  // Provider chain: Yahoo (query1 → query2) → Twelve Data (free, reliable
  // from Vercel IPs) → Finnhub (paid-tier only). Each provider runs only
  // if the previous one didn't return points; failures accumulate so the
  // log message lists every reason the chart is empty.
  const errors: string[] = [];
  let points: ChartPoint[] | null = null;

  try {
    points = await fetchChartFromYahoo(symbol, range);
  } catch (err) {
    errors.push(`Yahoo: ${err instanceof Error ? err.message : String(err)}`);
  }

  if ((!points || points.length === 0) && process.env.TWELVE_DATA_API_KEY) {
    try {
      points = await fetchChartFromTwelveData(symbol, range, process.env.TWELVE_DATA_API_KEY);
    } catch (err) {
      errors.push(`TwelveData: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if ((!points || points.length === 0) && process.env.FINNHUB_API_KEY) {
    try {
      points = await fetchChartFromFinnhub(symbol, range, process.env.FINNHUB_API_KEY);
    } catch (err) {
      errors.push(`Finnhub: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!points || points.length === 0) {
    const message = errors.join(" | ") || "no data";
    console.error(`[api/yahoo/chart] ${symbol} (${range}) failed: ${message}`);
    return res.status(502).json({ error: "Chart request failed", message });
  }

  // Cache successful responses aggressively so a single Yahoo win lasts a
  // while: 30 minutes at the edge, up to 2 hours of stale-while-revalidate.
  // This dramatically reduces upstream load and shrugs off rate limits.
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=7200");
  return res.status(200).json({ symbol, range, points });
}
