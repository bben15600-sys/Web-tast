import { useQuery } from "@tanstack/react-query";

export type FxRate = {
  base: string;
  quote: string;
  rate: number;
  source: string;
};

export type UseFxRateResult = {
  rate: number | null;
  source: string | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Live FX rate hook. Defaults to USD → ILS.
 * Cached for 1 hour; falls back to providers inside the serverless function.
 */
export function useFxRate(
  base: string = "USD",
  quote: string = "ILS",
): UseFxRateResult {
  const query = useQuery<FxRate>({
    queryKey: ["fx", base, quote],
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/fx?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}`,
        { signal },
      );
      const data = (await response.json()) as { rate?: number; source?: string; error?: string };
      if (!response.ok || typeof data.rate !== "number") {
        throw new Error(data.error || `FX fetch failed (${response.status})`);
      }
      return { base, quote, rate: data.rate, source: data.source ?? "unknown" };
    },
  });

  return {
    rate: query.data?.rate ?? null,
    source: query.data?.source ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
