import type { VercelRequest, VercelResponse } from "@vercel/node";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

// Fallback providers in order. First success wins.
// open.er-api.com — free, no key, updates hourly, ~99.9% uptime.
// Yahoo Finance — kept as secondary; tends to break for cloud IPs.
async function fetchFromOpenErApi(base: string): Promise<Record<string, number>> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`open.er-api.com ${response.status}`);
  const data = (await response.json()) as { result?: string; rates?: Record<string, number> };
  if (data.result !== "success" || !data.rates) {
    throw new Error(`open.er-api.com returned result=${data.result}`);
  }
  return data.rates;
}

async function fetchFromYahooFx(base: string, quote: string): Promise<number> {
  const symbol = `${base}${quote}=X`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Yahoo ${response.status}: ${text.slice(0, 80)}`);
  let data: { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Yahoo non-JSON: ${text.slice(0, 80)}`);
  }
  const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    throw new Error(`Yahoo: no regularMarketPrice for ${symbol}`);
  }
  return price;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const base = typeof req.query.base === "string" ? req.query.base.toUpperCase() : "USD";
  const quote = typeof req.query.quote === "string" ? req.query.quote.toUpperCase() : "ILS";

  const errors: string[] = [];

  try {
    const rates = await fetchFromOpenErApi(base);
    const rate = rates[quote];
    if (typeof rate !== "number" || !Number.isFinite(rate)) {
      throw new Error(`open.er-api.com: quote ${quote} missing for base ${base}`);
    }
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json({ base, quote, rate, source: "open.er-api.com" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`open.er-api.com: ${msg}`);
    console.error(`[api/fx] open.er-api.com failed: ${msg}`);
  }

  try {
    const rate = await fetchFromYahooFx(base, quote);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json({ base, quote, rate, source: "yahoo" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`yahoo: ${msg}`);
    console.error(`[api/fx] yahoo failed: ${msg}`);
  }

  return res.status(502).json({
    error: "All FX providers failed",
    base,
    quote,
    errors,
  });
}
