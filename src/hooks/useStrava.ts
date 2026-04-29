import { useQuery } from "@tanstack/react-query";

export type StravaActivity = {
  id: string;
  date: string;
  type: string;
  title: string;
  durationMin: number;
  kcal: number;
  distance: number;
  elevation: number;
  source: "strava";
};

export type UseStravaResult = {
  connected: boolean;
  activities: StravaActivity[];
  isLoading: boolean;
  error: string | null;
  connectUrl: string;
  disconnect: () => Promise<void>;
  refetch: () => void;
};

export function useStrava(perPage = 20): UseStravaResult {
  const query = useQuery<{ connected: boolean; activities: StravaActivity[] }>({
    queryKey: ["strava", "activities", perPage],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/strava/activities?per_page=${perPage}`, { signal });
      if (r.status === 401) {
        return { connected: false, activities: [] };
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Strava error (${r.status})`);
      return data;
    },
  });

  const disconnect = async () => {
    await fetch("/api/strava/disconnect", { method: "POST" });
    query.refetch();
  };

  return {
    connected: query.data?.connected ?? false,
    activities: query.data?.activities ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    connectUrl: "/api/strava/auth",
    disconnect,
    refetch: () => { query.refetch(); },
  };
}
