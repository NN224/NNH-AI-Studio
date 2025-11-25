import { useQuery } from "@tanstack/react-query";
import { StatsService, DashboardStats } from "@/lib/services/stats-service";

export const STATS_KEYS = {
  all: ["stats"] as const,
  dashboard: (period: string) =>
    [...STATS_KEYS.all, "dashboard", period] as const,
};

export function useDashboardStats(
  period: "day" | "week" | "month" | "year" = "month",
) {
  return useQuery({
    queryKey: STATS_KEYS.dashboard(period),
    queryFn: () => StatsService.getDashboardStats(period),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
