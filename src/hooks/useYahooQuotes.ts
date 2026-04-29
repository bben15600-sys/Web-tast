import { useQuery } from "@tanstack/react-query";

export type YahooQuote = {
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

export type YahooQuoteError = { symbol: string; message: string };

export type UseYahooQuotesResult = {
  quotes: Record<string, YahooQuote>;
  errors: YahooQuoteError[];
  isLoading: boolean;
  error: string | null;
};

type QueryData = {
  quotes: Record<string, YahooQuote>;
  errors: YahooQuoteError[];
};

export function useYahooQuotes(symbols: string[]): UseYahooQuotesResult {
  const clean = Array.from(
    new Set(symbols.map((s) => s?.trim()).filter((s): s is string => Boolean(s))),
  ).sort();

  const query = useQuery<QueryData>({
    queryKey: ["yahoo", "quotes", clean.join(",")],
    enabled: clean.length > 0,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/yahoo/quote?symbols=${encodeURIComponent(clean.join(","))}`, { signal });
      const data = (await response.json()) as {
        quotes?: YahooQuote[];
        errors?: YahooQuoteError[];
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message || data.error || `Yahoo Finance request failed (${response.status})`);
      }
      const map: Record<string, YahooQuote> = {};
      for (const q of data.quotes ?? []) {
        if (q.symbol) map[q.symbol] = q;
      }
      return { quotes: map, errors: data.errors ?? [] };
    },
  });

  return {
    quotes: query.data?.quotes ?? {},
    errors: query.data?.errors ?? [],
    isLoading: query.isLoading && clean.length > 0,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
