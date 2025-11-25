export interface DashboardStats {
  // Core metrics from API
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

  // Metadata
  lastUpdated: string;
  source: string;

  // Optional trend data
  trends?: {
    date: string;
    reviews: number;
    rating: number;
  }[];
  demographics?: {
    name: string;
    value: number;
  }[];
}

export const StatsService = {
  getDashboardStats: async (
    period: "day" | "week" | "month" | "year" = "month",
  ): Promise<DashboardStats> => {
    const response = await fetch(`/api/dashboard/stats?period=${period}`);
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");
    return response.json();
  },
};
