import type { ConnectionStatus } from "@/lib/services/gmb-service";
import { useQuery } from "@tanstack/react-query";

/**
 * Unified Connection Status Hook
 *
 * Supports partial connections - GMB and YouTube can be connected independently.
 * This allows the UI to render YouTube stats even if GMB is not connected, and vice versa.
 */

export const CONNECTION_STATUS_KEYS = {
  all: ["connection-status"] as const,
};

/**
 * Fetch unified connection status
 */
async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  const response = await fetch("/api/connection/status");

  if (!response.ok) {
    throw new Error("Failed to fetch connection status");
  }

  return response.json();
}

/**
 * Hook to get unified connection status
 */
export function useConnectionStatus() {
  return useQuery({
    queryKey: CONNECTION_STATUS_KEYS.all,
    queryFn: fetchConnectionStatus,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Helper hook to check if GMB is connected
 */
export function useHasGmbConnection() {
  const { data } = useConnectionStatus();
  return data?.hasGmbConnection ?? false;
}

/**
 * Helper hook to check if YouTube is connected
 */
export function useHasYoutubeConnection() {
  const { data } = useConnectionStatus();
  return data?.hasYoutubeConnection ?? false;
}

/**
 * Helper hook to check if any service is connected
 */
export function useHasAnyConnection() {
  const { data } = useConnectionStatus();
  return (data?.hasGmbConnection || data?.hasYoutubeConnection) ?? false;
}
