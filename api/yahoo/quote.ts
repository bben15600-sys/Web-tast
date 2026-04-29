import type { VercelRequest, VercelResponse } from "@vercel/node";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

type NormalizedQuote = {
  symbol: string;
  name: string | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  exchange: string | null;
  marketState: string | null;
};

type ChartMeta = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  currency?: string;
  fullExchangeName?: string;
  exchangeName?: string;
  marketState?: string;
};

async function fetchQuoteOnce(symbol: string, host: string): Promise<NormalizedQuote> {
  const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Yahoo ${response.status} for ${symbol}: ${text.slice(0, 80)}`);
  }
  let data: { chart?: { result?: Array<{ meta?: ChartMeta }>; error?: { description?: string } } };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON for ${symbol}: ${text.slice(0, 80)}`);
  }
  if (data.chart?.error?.description) {
    throw new Error(`Yahoo: ${data.chart.error.description}`);
  }
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No chart meta for ${symbol}`);

  const price = numberOrNull(meta.regularMarketPrice);
  const prev = numberOrNull(meta.chartPreviousClose) ?? numberOrNull(meta.previousClose);
  const change = price != null && prev != null ? price - prev : null;
  const changePct = change != null && prev != null && prev !== 0 ? (change / prev) * 100 : null;

  return {
    symbol: meta.symbol ?? symbol,
    name: meta.shortName ?? meta.longName ?? null,
    price,
    previousClose: prev,
    change,
    changePct,
    currency: meta.currency ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
    marketState: meta.marketState ?? null,
  };
}

// Retry pattern: try query1, then brief pause, then query2. Yahoo load-balances
// between the two and a transient 500 on one often succeeds on the other.
async function fetchFromYahoo(symbol: string): Promise<NormalizedQuote> {
  try {
    return await fetchQuoteOnce(symbol, "query1.finance.yahoo.com");
  } catch (first) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      return await fetchQuoteOnce(symbol, "query2.finance.yahoo.com");
    } catch (second) {
      const firstMsg = first instanceof Error ? first.message : String(first);
      const secondMsg = second instanceof Error ? second.message : String(second);
      throw new Error(`${firstMsg} | retry: ${secondMsg}`);
    }
  }
}

type FinnhubQuote = { c?: number; d?: number; dp?: number; pc?: number; t?: number };

async function fetchFromFinnhub(symbol: string, apiKey: string): Promise<NormalizedQuote> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Finnhub ${response.status}: ${text.slice(0, 80)}`);
  }
  let data: FinnhubQuote;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Finnhub non-JSON: ${text.slice(0, 80)}`);
  }
  const price = numberOrNull(data.c);
  const prev = numberOrNull(data.pc);
  const change = numberOrNull(data.d);
  const changePct = numberOrNull(data.dp);

  // Finnhub returns 0s for unknown symbols — detect and throw.
  if ((price == null || price === 0) && (prev == null || prev === 0)) {
    throw new Error(`Finnhub: no data for ${symbol}`);
  }

  return {
    symbol,
    name: null,
    price,
    previousClose: prev,
    change,
    changePct,
    currency: "USD",
    exchange: null,
    marketState: null,
  };
}

// Stooq maps symbols like `VOO` → `voo.us`, `^DJI` → `^dji`. It does not give
// a previous close directly, so `change` is computed as (close - open), i.e.
// the intraday swing. For indices (continuous sessions) this is a reasonable
// proxy for "today's change"; for equities it's directionally correct but
// misses overnight gaps.
function toStooqSymbol(symbol: string): string {
  if (symbol.startsWith("^")) return symbol.toLowerCase();
  // Already has an exchange suffix (FOO.TA / FOO.DE / ...)
  if (/\.[A-Z]{2,3}$/i.test(symbol)) return symbol.toLowerCase();
  return `${symbol.toLowerCase()}.us`;
}

async function fetchFromStooq(symbol: string): Promise<NormalizedQuote> {
  const stooqSym = toStooqSymbol(symbol);
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSym)}&f=sd2t2ohlcv&e=csv&h`;
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`Stooq ${response.status}`);
  const text = (await response.text()).trim();
  const lines = text.split("\n");
  if (lines.length < 2) throw new Error(`Stooq empty response`);
  const headers = lines[0].split(",");
  const values = lines[1].split(",");
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h.trim()] = (values[i] ?? "").trim();
  });

  const closeRaw = row.Close;
  const openRaw = row.Open;
  if (!closeRaw || closeRaw === "N/D" || closeRaw === "-") {
    throw new Error(`Stooq: no data for ${symbol} (as ${stooqSym})`);
  }
  const close = parseFloat(closeRaw);
  const open = parseFloat(openRaw);
  if (!Number.isFinite(close)) {
    throw new Error(`Stooq: unparseable close for ${symbol}`);
  }
  const change = Number.isFinite(open) ? close - open : null;
  const changePct = change != null && open !== 0 ? (change / open) * 100 : null;

  // Best-effort currency guess — Stooq doesn't report it.
  const currency = stooqSym.endsWith(".us") || stooqSym.startsWith("^") ? "USD" : null;

  return {
    symbol,
    name: null,
    price: close,
    previousClose: Number.isFinite(open) ? open : null,
    change,
    changePct,
    currency,
    exchange: null,
    marketState: null,
  };
}

// Provider chain: Yahoo → Finnhub (if configured) → Stooq. First success wins.
async function fetchQuoteViaChart(symbol: string): Promise<NormalizedQuote> {
  const errors: string[] = [];
  try {
    return await fetchFromYahoo(symbol);
  } catch (e) {
    errors.push(`Yahoo: ${e instanceof Error ? e.message : String(e)}`);
  }
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) {
    try {
      return await fetchFromFinnhub(symbol, finnhubKey);
    } catch (e) {
      errors.push(`Finnhub: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  try {
    return await fetchFromStooq(symbol);
  } catch (e) {
    errors.push(`Stooq: ${e instanceof Error ? e.message : String(e)}`);
  }
  throw new Error(errors.join(" | "));
}

function numberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const raw = req.query.symbols;
  const symbols = typeof raw === "string"
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(raw)
      ? raw.flatMap((s) => s.split(",").map((t) => t.trim()).filter(Boolean))
      : [];

  if (symbols.length === 0) {
    return res.status(400).json({ error: "symbols query parameter is required" });
  }
  if (symbols.length > 30) {
    return res.status(400).json({ error: "max 30 symbols per request" });
  }

  // Fire all symbol requests in parallel. Per-symbol errors don't kill the
  // whole batch — a missing quote just drops out of the response.
  const settled = await Promise.allSettled(symbols.map(fetchQuoteViaChart));
  const quotes: NormalizedQuote[] = [];
  const errors: Array<{ symbol: string; message: string }> = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      quotes.push(r.value);
    } else {
      const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error(`[api/yahoo/quote] ${symbols[i]} failed: ${message}`);
      errors.push({ symbol: symbols[i], message });
    }
  });

  if (quotes.length === 0) {
    return res.status(502).json({
      error: "All Yahoo quote requests failed",
      errors,
    });
  }

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ quotes, errors });
}
