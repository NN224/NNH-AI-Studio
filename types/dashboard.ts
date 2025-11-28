export type LocationStatus = "active" | "disconnected" | "archived";

// =====================================================
// Home Page Types (Optimized)
// =====================================================

export interface UserData {
  id: string;
  email?: string;
  last_sign_in_at?: string;
}

export interface ProfileData {
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

export interface DashboardStatsData {
  locationsCount: number | null;
  reviewsCount: number | null;
  accountsCount: number | null;
  averageRating: string;
  todayReviewsCount: number | null;
  weeklyGrowth: number;
  reviewsTrend: number[];
  youtubeSubs: string | null;
  hasYouTube: boolean;
  hasAccounts: boolean;
  responseRate: number;
  streak: number;
}

export interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
  href: string;
}

export interface ActivityItem {
  id: string;
  type: "review" | "youtube" | "location" | "post";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: any;
  actionUrl?: string;
}

export interface InsightItem {
  id: string;
  type: "alert" | "success" | "recommendation" | "tip";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionText?: string;
  actionUrl?: string;
  impact?: string;
}

export interface HomePageData {
  user: UserData;
  profile: ProfileData | null;
  stats: DashboardStatsData;
  progressItems: ProgressItem[];
  activities: ActivityItem[];
  insights: InsightItem[];
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
}

// =====================================================
// Original Dashboard Types
// =====================================================

export interface DashboardSnapshot {
  generatedAt: string;
  userId: string;
  locationSummary: {
    totalLocations: number;
    activeLocations: number;
    inactiveLocations: number;
    lastGlobalSync: string | null;
    profileCompletenessAverage: number | null;
    locations: Array<{
      id: string;
      name: string;
      accountId: string | null;
      status: LocationStatus;
      rating: number | null;
      reviewCount: number;
      profileCompleteness?: number | null;
      pendingReviews?: number | null;
      lastSync: {
        reviews: string | null;
        posts: string | null;
        questions: string | null;
        automation: string | null;
      };
    }>;
  };
  kpis: {
    healthScore: number;
    responseRate: number;
    reviewTrendPct: number;
    ratingTrendPct: number;
    totalReviews: number;
    unansweredQuestions: number;
    pendingReviews: number;
    automationActiveCount: number;
  };
  reviewStats: {
    totals: {
      total: number;
      pending: number;
      replied: number;
      flagged: number;
    };
    byRating: Record<"1" | "2" | "3" | "4" | "5", number>;
    bySentiment: Record<"positive" | "neutral" | "negative", number>;
    averageRating: number;
    responseRate: number;
    lastSync: string | null;
    recentHighlights: Array<{
      reviewId: string;
      locationId: string;
      reviewer: string;
      rating: number;
      createdAt: string | null;
    }>;
  };
  postStats: {
    totals: {
      total: number;
      published: number;
      drafts: number;
      scheduled: number;
      failed: number;
    };
    byType: Record<"whats_new" | "event" | "offer", number>;
    thisWeek: number;
    lastSync: string | null;
    recentPosts: Array<{
      id: string;
      locationId: string;
      status: "draft" | "queued" | "published" | "failed";
      publishedAt: string | null;
      title: string | null;
    }>;
  };
  questionStats: {
    totals: {
      total: number;
      unanswered: number;
      answered: number;
    };
    // NOTE: byPriority is optional - priority column doesn't exist in gmb_questions table
    // TODO: Add priority column to gmb_questions if needed in future
    byPriority?: Record<"urgent" | "high" | "medium" | "low", number>;
    byStatus: Record<"pending" | "answered" | "hidden", number>;
    answerRate: number;
    lastSync: string | null;
    recentQuestions: Array<{
      id: string;
      locationId: string;
      questionText: string;
      createdAt: string | null;
      answerStatus: string | null;
      upvoteCount: number;
    }>;
  };
  monthlyComparison?: {
    current: {
      reviews: number;
      rating: number;
      questions: number;
    };
    previous: {
      reviews: number;
      rating: number;
      questions: number;
    };
  } | null;
  locationHighlights?: Array<{
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    pendingReviews: number;
    ratingChange?: number;
    category: "top" | "attention" | "improved";
  }>;
  automationStats: {
    totalAutomations: number;
    activeAutomations: number;
    pausedAutomations: number;
    autoReplyEnabled: number;
    successRatePct: number | null;
    lastRunAt: string | null;
    lastSync: string | null;
    recentLogs: Array<{
      id: string;
      locationId: string | null;
      actionType: string | null;
      status: string | null;
      createdAt: string;
    }>;
  };
  tasksSummary: {
    weeklyTasksGenerated: boolean;
    pendingTasks: number;
    completedTasks: number;
    lastGeneratedAt: string | null;
  };
  bottlenecks: Array<{
    type: "Reviews" | "Response" | "Content" | "Compliance" | "General";
    severity: "low" | "medium" | "high";
    count: number;
    message: string;
    link: string;
  }>;
}
