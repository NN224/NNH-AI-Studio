/**
 * دوال مساعدة للتعامل مع البيانات غير المحددة أو الفارغة
 * تضمن إرجاع قيم افتراضية آمنة بدلاً من التسبب بأخطاء
 */

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
 * التحقق من صحة بيانات المراجعات وتوفير قيم افتراضية
 */
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
 * التحقق من صحة بيانات مركز القيادة وتوفير قيم افتراضية
 */
export interface SafeCommandCenterStats {
  rating: number;
  ratingChange: number;
  totalReviews: number;
  pendingCount: number;
  responseRate: number;
  attentionCount: number;
}

export function safeCommandCenterStats(data: unknown): SafeCommandCenterStats {
  const fallback: SafeCommandCenterStats = {
    rating: 0,
    ratingChange: 0,
    totalReviews: 0,
    pendingCount: 0,
    responseRate: 0,
    attentionCount: 0,
  };

  if (!data || typeof data !== "object") return fallback;

  const stats = data as Partial<SafeCommandCenterStats>;

  return {
    rating: safeValue(stats.rating, 0),
    ratingChange: safeValue(stats.ratingChange, 0),
    totalReviews: safeValue(stats.totalReviews, 0),
    pendingCount: safeValue(stats.pendingCount, 0),
    responseRate: safeValue(stats.responseRate, 0),
    attentionCount: safeValue(stats.attentionCount, 0),
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
