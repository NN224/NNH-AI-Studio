/**
 * @deprecated Use useBusinessStats from hooks/features/use-business-stats.ts instead
 * This hook is kept for backward compatibility but will be removed in the future.
 * The new unified hook prevents redundant fetches between Home and Dashboard.
 */

import { useBusinessStats } from "./use-business-stats";

export const STATS_KEYS = {
  all: ["stats"] as const,
  dashboard: (period: string) =>
    [...STATS_KEYS.all, "dashboard", period] as const,
};

/**
 * @deprecated Use useBusinessStats instead
 */
export function useDashboardStats(
  _period: "day" | "week" | "month" | "year" = "month",
) {
  // Redirect to unified hook
  return useBusinessStats();
}
