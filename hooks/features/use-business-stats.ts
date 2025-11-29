import { useQuery } from "@tanstack/react-query";

/**
 * Unified Business Stats Hook
 *
 * This hook consolidates all dashboard/business stats fetching into a single
 * cache key to prevent redundant API calls when navigating between Home and Dashboard.
 *
 * Previously, we had:
 * - hooks/features/use-stats.ts with key ["stats", "dashboard", period]
 * - hooks/use-dashboard-cache.ts with key "dashboard-stats-{params}"
 * - hooks/use-ai-command-center.ts fetching /api/dashboard/stats separately
 *
 * Now all use the SAME cache key: ["business-stats", accountId]
 */

export interface BusinessStats {
  // Core metrics
  totalLocations: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;

  // Pending items
  pendingReviews: number;
  totalQuestions: number;
  pendingQuestions: number;
  avgResponseTime: string;

  // Additional stats
  repliedReviews: number;
  recentReviews: number;
  totalViews?: number;

  // Charts data
  trends?: {
    date: string;
    reviews: number;
    rating: number;
  }[];
  demographics?: {
    name: string;
    value: number;
  }[];

  // Metadata
  lastUpdated: string;
  source: string;
}

// Unified cache keys
export const BUSINESS_STATS_KEYS = {
  all: ["business-stats"] as const,
  byAccount: (accountId?: string) =>
    accountId
      ? ([...BUSINESS_STATS_KEYS.all, accountId] as const)
      : BUSINESS_STATS_KEYS.all,
};

/**
 * Unified hook to fetch business statistics
 *
 * @param accountId - Optional GMB account ID for multi-account support
 * @returns React Query result with business stats
 */
export function useBusinessStats(accountId?: string) {
  return useQuery({
    queryKey: BUSINESS_STATS_KEYS.byAccount(accountId),
    queryFn: async (): Promise<BusinessStats> => {
      const url = accountId
        ? `/api/dashboard/stats?accountId=${accountId}`
        : "/api/dashboard/stats";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch business stats: ${response.status}`);
      }

      return response.json();
    },
    // Cache for 5 minutes - balance between freshness and performance
    staleTime: 1000 * 60 * 5,
    // Keep in cache for 30 minutes even if unused
    gcTime: 1000 * 60 * 30,
    // Refetch on window focus to ensure data is fresh
    refetchOnWindowFocus: true,
    // Retry once on failure
    retry: 1,
  });
}

/**
 * Hook for management section stats (subset of business stats)
 * Uses the same cache as useBusinessStats to avoid duplicate fetches
 */
export function useManagementStats(accountId?: string) {
  const { data, isLoading, error } = useBusinessStats(accountId);

  return {
    data: data
      ? {
          reviews: {
            total: data.totalReviews,
            pending: data.pendingReviews,
            responseRate: `${data.responseRate}%`,
          },
          questions: {
            total: data.totalQuestions,
            unanswered: data.pendingQuestions,
            avgResponseTime: data.avgResponseTime,
          },
        }
      : null,
    isLoading,
    error,
  };
}

/**
 * Hook for dashboard overview (subset of business stats)
 * Uses the same cache as useBusinessStats to avoid duplicate fetches
 */
export function useDashboardOverview(accountId?: string) {
  const { data, isLoading, error, refetch } = useBusinessStats(accountId);

  return {
    data: data
      ? {
          totalLocations: data.totalLocations,
          averageRating: data.averageRating,
          totalReviews: data.totalReviews,
          pendingReviews: data.pendingReviews,
          responseRate: data.responseRate,
        }
      : null,
    isLoading,
    error,
    refetch,
  };
}
