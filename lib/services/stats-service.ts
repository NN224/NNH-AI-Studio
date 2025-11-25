export interface DashboardStats {
  overview: {
    totalViews: number;
    totalInteractions: number;
    averageRating: number;
    responseRate: number;
  };
  trends: {
    date: string;
    views: number;
    searches: number;
    actions: number;
  }[];
  demographics: {
    name: string;
    value: number;
  }[];
  platformDistribution: {
    name: string;
    value: number;
    color: string;
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
