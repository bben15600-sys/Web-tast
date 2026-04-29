import { useQuery } from "@tanstack/react-query";

export type YahooChartRange = "1mo" | "3mo" | "6mo" | "1y" | "ytd" | "5y";

export type YahooChartPoint = { date: string; close: number };

export function useYahooChart(symbol: string | null | undefined, range: YahooChartRange = "3mo") {
  const active = Boolean(symbol);
  return useQuery<YahooChartPoint[]>({
    queryKey: ["yahoo", "chart", symbol ?? "", range],
    enabled: active,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/yahoo/chart?symbol=${encodeURIComponent(symbol!)}&range=${range}`,
        { signal },
      );
      const data = (await response.json()) as { points?: YahooChartPoint[]; error?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.message || data.error || `Chart request failed (${response.status})`);
      }
      return data.points ?? [];
    },
  });
}
