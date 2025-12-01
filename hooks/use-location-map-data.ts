import { useState, useEffect } from "react";
import { Location } from "@/components/locations/location-types";
import { apiLogger } from "@/lib/utils/logger";

interface LocationStats {
  totalLocations: number;
  avgRating: number;
  reviewCount: number;
  healthScore: number;
  ratingTrend?: number;
}

interface LocationMapData {
  stats: LocationStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch location stats for map view
 */
export function useLocationMapData(
  locationId: string | undefined,
): LocationMapData {
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/locations/${locationId}/stats`);

        if (!response.ok) {
          throw new Error("Failed to fetch location stats");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        apiLogger.error(
          "Error fetching location stats",
          err instanceof Error ? err : new Error(String(err)),
          { locationId },
        );
        setError(err instanceof Error ? err.message : "Failed to load stats");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [locationId]);

  return { stats, loading, error };
}
