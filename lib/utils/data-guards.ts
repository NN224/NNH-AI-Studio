/**
 * دوال مساعدة للتعامل مع البيانات غير المحددة أو الفارغة
 * تضمن إرجاع قيم افتراضية آمنة بدلاً من التسبب بأخطاء
 */

/**
 * واجهة البيانات الرئيسية للوحة المعلومات
 */
export interface DashboardData {
  kpis: {
    totalLocations: number;
    reviewTrendPct: number;
    responseRate: number;
    healthScore: number;
    ratingTrendPct: number;
    totalReviews: number;
    unansweredQuestions: number;
    pendingReviews: number;
    automationActiveCount: number;
  };
  stats: {
    total: number;
    pending: number;
    completed: number;
    averageRating: number;
    responseRate: number;
    reviewsCount: number;
  };
  reviewStats: {
    totals: {
      total: number;
      pending: number;
      replied: number;
      flagged: number;
    };
    byRating: Record<string, number>;
    bySentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
    averageRating: number;
    responseRate: number;
  };
}

/**
 * واجهة بيانات مركز القيادة
 */
export interface SafeCommandCenterStats {
  rating: number;
  ratingChange: number;
  totalReviews: number;
  pendingCount: number;
  responseRate: number;
  attentionCount: number;
}

/**
 * دالة حماية بيانات مركز القيادة
 */
export function safeCommandCenterStats(stats: unknown): SafeCommandCenterStats {
  const defaultStats = {
    rating: 0,
    ratingChange: 0,
    totalReviews: 0,
    pendingCount: 0,
    responseRate: 0,
    attentionCount: 0,
  };

  if (!stats || typeof stats !== "object") return defaultStats;

  const input = stats as Partial<{
    rating: number;
    ratingChange: number;
    totalReviews: number;
    pendingCount: number;
    responseRate: number;
    attentionCount: number;
  }>;

  return {
    rating: safeValue(input.rating, 0),
    ratingChange: safeValue(input.ratingChange, 0),
    totalReviews: safeValue(input.totalReviews, 0),
    pendingCount: safeValue(input.pendingCount, 0),
    responseRate: safeValue(input.responseRate, 0),
    attentionCount: safeValue(input.attentionCount, 0),
  };
}

/**
 * دالة حماية البيانات الرئيسية للوحة المعلومات
 */
export function safeDashboardData(data: unknown): DashboardData {
  const defaultData: DashboardData = {
    kpis: {
      totalLocations: 0,
      reviewTrendPct: 0,
      responseRate: 0,
      healthScore: 0,
      ratingTrendPct: 0,
      totalReviews: 0,
      unansweredQuestions: 0,
      pendingReviews: 0,
      automationActiveCount: 0,
    },
    stats: {
      total: 0,
      pending: 0,
      completed: 0,
      averageRating: 0,
      responseRate: 0,
      reviewsCount: 0,
    },
    reviewStats: {
      totals: {
        total: 0,
        pending: 0,
        replied: 0,
        flagged: 0,
      },
      byRating: {},
      bySentiment: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      averageRating: 0,
      responseRate: 0,
    },
  };

  if (!data || typeof data !== "object") return defaultData;
  const input = data as Partial<DashboardData>;

  return {
    kpis: {
      totalLocations: safeValue(input.kpis?.totalLocations, 0),
      reviewTrendPct: safeValue(input.kpis?.reviewTrendPct, 0),
      responseRate: safeValue(input.kpis?.responseRate, 0),
      healthScore: safeValue(input.kpis?.healthScore, 0),
      ratingTrendPct: safeValue(input.kpis?.ratingTrendPct, 0),
      totalReviews: safeValue(input.kpis?.totalReviews, 0),
      unansweredQuestions: safeValue(input.kpis?.unansweredQuestions, 0),
      pendingReviews: safeValue(input.kpis?.pendingReviews, 0),
      automationActiveCount: safeValue(input.kpis?.automationActiveCount, 0),
    },
    stats: {
      total: safeValue(input.stats?.total, 0),
      pending: safeValue(input.stats?.pending, 0),
      completed: safeValue(input.stats?.completed, 0),
      averageRating: safeValue(input.stats?.averageRating, 0),
      responseRate: safeValue(input.stats?.responseRate, 0),
      reviewsCount: safeValue(input.stats?.reviewsCount, 0),
    },
    reviewStats: {
      totals: {
        total: safeValue(input.reviewStats?.totals?.total, 0),
        pending: safeValue(input.reviewStats?.totals?.pending, 0),
        replied: safeValue(input.reviewStats?.totals?.replied, 0),
        flagged: safeValue(input.reviewStats?.totals?.flagged, 0),
      },
      byRating: safeValue(input.reviewStats?.byRating, {}),
      bySentiment: {
        positive: safeValue(input.reviewStats?.bySentiment?.positive, 0),
        neutral: safeValue(input.reviewStats?.bySentiment?.neutral, 0),
        negative: safeValue(input.reviewStats?.bySentiment?.negative, 0),
      },
      averageRating: safeValue(input.reviewStats?.averageRating, 0),
      responseRate: safeValue(input.reviewStats?.responseRate, 0),
    },
  };
}

/**
 * التحقق من وجود قيمة وإرجاع قيمة افتراضية إذا كانت القيمة غير محددة
 */
export function safeValue<T>(value: unknown, defaultValue: T): T {
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

/**
 * التحقق من صحة بيانات الإحصاءات وتوفير قيم افتراضية
 */
export interface SafeStats {
  totalLocations: number;
  reviewsCount: number;
  averageRating: number;
  responseRate: number;
  reviewTrendPct: number;
  totalViews: number;
  totalInteractions: number;
}

export function safeStats(data: unknown): SafeStats {
  const fallback: SafeStats = {
    totalLocations: 0,
    reviewsCount: 0,
    averageRating: 0.0,
    responseRate: 0,
    reviewTrendPct: 0,
    totalViews: 0,
    totalInteractions: 0,
  };

  if (!data || typeof data !== "object") return fallback;

  const stats = data as Partial<SafeStats>;

  return {
    totalLocations: safeValue(stats.totalLocations, 0),
    reviewsCount: safeValue(stats.reviewsCount, 0),
    averageRating: safeValue(stats.averageRating, 0.0),
    responseRate: safeValue(stats.responseRate, 0),
    reviewTrendPct: safeValue(stats.reviewTrendPct, 0),
    totalViews: safeValue(stats.totalViews, 0),
    totalInteractions: safeValue(stats.totalInteractions, 0),
  };
}

/**
 * واجهة إحصائيات المراجعات الآمنة
 */
export interface SafeReviewStats {
  total: number;
  pending: number;
  averageRating: number;
  responseRate: number;
}

/**
 * دالة حماية إحصائيات المراجعات
 */
export function safeReviewStats(stats: unknown): SafeReviewStats {
  const defaultStats: SafeReviewStats = {
    total: 0,
    pending: 0,
    averageRating: 0,
    responseRate: 0,
  };

  if (!stats || typeof stats !== "object") return defaultStats;

  const input = stats as Partial<SafeReviewStats>;

  return {
    total: safeValue(input.total, 0),
    pending: safeValue(input.pending, 0),
    averageRating: safeValue(input.averageRating, 0),
    responseRate: safeValue(input.responseRate, 0),
  };
}

export interface SafeReviewsData {
  totalReviews: number;
  pendingReviews: number;
  responseRate: number;
  avgRating: number;
  ratingTrend: number;
}

export function safeReviewsData(data: unknown): SafeReviewsData {
  const fallback: SafeReviewsData = {
    totalReviews: 0,
    pendingReviews: 0,
    responseRate: 0,
    avgRating: 0,
    ratingTrend: 0,
  };

  if (!data || typeof data !== "object") return fallback;

  const reviews = data as Partial<SafeReviewsData>;

  return {
    totalReviews: safeValue(reviews.totalReviews, 0),
    pendingReviews: safeValue(reviews.pendingReviews, 0),
    responseRate: safeValue(reviews.responseRate, 0),
    avgRating: safeValue(reviews.avgRating, 0),
    ratingTrend: safeValue(reviews.ratingTrend, 0),
  };
}

/**
 * الحصول على قيمة آمنة من كائن بمسار معين
 * مثال: safePath(data, ["user", "profile", "name"], "Default Name")
 */
export function safePath<T>(obj: unknown, path: string[], defaultValue: T): T {
  if (!obj || typeof obj !== "object") return defaultValue;

  let current: Record<string, unknown> = obj as Record<string, unknown>;

  for (const key of path) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object"
    ) {
      return defaultValue;
    }
    current = current[key] as Record<string, unknown>;
    if (current === undefined || current === null) {
      return defaultValue;
    }
  }

  return current !== undefined ? (current as unknown as T) : defaultValue;
}

/**
 * تحويل قيمة إلى مصفوفة آمنة
 */
export function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value as T[];
  return defaultValue;
}

/**
 * تحويل قيمة إلى كائن آمن
 */
export function safeObject<T extends object>(
  value: unknown,
  defaultValue: T,
): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultValue;
  }
  return value as T;
}

/**
 * تحويل قيمة إلى رقم آمن
 */
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

/**
 * تحويل قيمة إلى نص آمن
 */
export function safeString(value: unknown, defaultValue: string = ""): string {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

/**
 * تحويل قيمة إلى قيمة منطقية آمنة
 */
export function safeBoolean(
  value: unknown,
  defaultValue: boolean = false,
): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}
