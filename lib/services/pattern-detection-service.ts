/**
 * 🔍 PATTERN DETECTION SERVICE
 *
 * Detects patterns in reviews, questions, and business data
 * to generate actionable insights.
 *
 * Key Capabilities:
 * - Complaint clustering (recurring issues)
 * - Time-based patterns (day/hour trends)
 * - Sentiment trends (improving/declining)
 * - Topic extraction (common themes)
 * - Rating analysis (sudden changes)
 */

import { createAdminClient } from "@/lib/supabase/server";

// ============================================
// TYPES
// ============================================

export type PatternType =
  | "complaint_cluster" // Multiple reviews mention same issue
  | "day_pattern" // Negative reviews on specific days
  | "time_pattern" // Negative reviews at specific times
  | "rating_drop" // Rating suddenly declined
  | "rating_rise" // Rating improved
  | "topic_trend" // Specific topic gaining attention
  | "service_issue" // Service quality complaints
  | "product_issue"; // Product quality complaints

export interface DetectedPattern {
  type: PatternType;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  confidence: number; // 0-100
  affectedReviews: string[]; // Review IDs
  data: {
    count?: number;
    timeframe?: string;
    keywords?: string[];
    dayOfWeek?: string;
    hourOfDay?: number;
    ratingBefore?: number;
    ratingAfter?: number;
    percentage?: number;
  };
  actionable: boolean;
  suggestedAction?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_display_name: string;
  create_time: string;
  reply_text?: string;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Detect all patterns for a user's location
 */
export async function detectAllPatterns(
  userId: string,
  locationId?: string,
  timeframe: "day" | "week" | "month" = "week",
): Promise<DetectedPattern[]> {
  const supabase = createAdminClient();
  const patterns: DetectedPattern[] = [];

  try {
    // Get recent reviews
    const daysBack = timeframe === "day" ? 1 : timeframe === "week" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    let query = supabase
      .from("gmb_reviews")
      .select("*")
      .eq("user_id", userId)
      .gte("create_time", since.toISOString())
      .order("create_time", { ascending: false });

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data: reviews } = await query;

    if (!reviews || reviews.length === 0) {
      return patterns;
    }

    // Run all pattern detections
    const detections = await Promise.all([
      detectComplaintClusters(reviews),
      detectDayPatterns(reviews),
      detectTimePatterns(reviews),
      detectRatingTrends(reviews, userId, locationId),
      detectServiceIssues(reviews),
      detectProductIssues(reviews),
    ]);

    // Flatten and filter results
    detections.forEach((result) => {
      if (result) {
        if (Array.isArray(result)) {
          patterns.push(...result);
        } else {
          patterns.push(result);
        }
      }
    });

    // Sort by severity and confidence
    patterns.sort((a, b) => {
      const severityWeight = { high: 3, medium: 2, low: 1 };
      const aDiff = severityWeight[a.severity] * 100 + a.confidence;
      const bDiff = severityWeight[b.severity] * 100 + b.confidence;
      return bDiff - aDiff;
    });

    return patterns;
  } catch (error) {
    console.error("Pattern detection error:", error);
    return [];
  }
}

// ============================================
// PATTERN DETECTORS
// ============================================

/**
 * Detect complaint clusters - Same issue mentioned multiple times
 */
async function detectComplaintClusters(
  reviews: Review[],
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  const negativeReviews = reviews.filter((r) => r.rating <= 2 && r.comment);

  if (negativeReviews.length < 2) return patterns;

  // Common complaint keywords grouped by category
  const complaintCategories = {
    wait_time: [
      "wait",
      "waiting",
      "slow",
      "long time",
      "انتظار",
      "بطيء",
      "وقت طويل",
    ],
    service: [
      "rude",
      "unprofessional",
      "bad service",
      "وقح",
      "خدمة سيئة",
      "معاملة",
    ],
    quality: ["cold", "bad quality", "poor", "رديء", "جودة سيئة", "بارد"],
    cleanliness: ["dirty", "unclean", "hygiene", "وسخ", "نظافة", "قذر"],
    price: ["expensive", "overpriced", "غالي", "سعر", "مبالغ"],
  };

  // Check each category
  for (const [category, keywords] of Object.entries(complaintCategories)) {
    const matches = negativeReviews.filter((review) => {
      const text = review.comment.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    });

    if (matches.length >= 2) {
      const percentage = (matches.length / negativeReviews.length) * 100;
      const severity: "high" | "medium" | "low" =
        matches.length >= 3 ? "high" : matches.length >= 2 ? "medium" : "low";

      patterns.push({
        type: "complaint_cluster",
        severity,
        title: `Recurring ${category.replace("_", " ")} complaints`,
        description: `${matches.length} recent negative reviews mention issues with ${category.replace("_", " ")}`,
        confidence: Math.min(percentage * 1.5, 95),
        affectedReviews: matches.map((r) => r.id),
        data: {
          count: matches.length,
          timeframe: "recent",
          keywords: keywords.slice(0, 3),
          percentage: Math.round(percentage),
        },
        actionable: true,
        suggestedAction: `Review and address ${category.replace("_", " ")} issues immediately`,
      });
    }
  }

  return patterns;
}

/**
 * Detect day-of-week patterns
 */
async function detectDayPatterns(
  reviews: Review[],
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  const negativeReviews = reviews.filter((r) => r.rating <= 2);

  if (negativeReviews.length < 3) return patterns;

  // Group by day of week
  const dayGroups: Record<string, Review[]> = {};
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  negativeReviews.forEach((review) => {
    const date = new Date(review.create_time);
    const day = dayNames[date.getDay()];
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(review);
  });

  // Find days with unusually high negative reviews
  const avgPerDay = negativeReviews.length / 7;
  for (const [day, dayReviews] of Object.entries(dayGroups)) {
    if (dayReviews.length >= 2 && dayReviews.length > avgPerDay * 1.5) {
      const percentage = (dayReviews.length / negativeReviews.length) * 100;

      patterns.push({
        type: "day_pattern",
        severity: dayReviews.length >= 3 ? "high" : "medium",
        title: `${day} has unusually high negative reviews`,
        description: `${dayReviews.length} out of ${negativeReviews.length} negative reviews occurred on ${day}`,
        confidence: Math.min(percentage * 2, 90),
        affectedReviews: dayReviews.map((r) => r.id),
        data: {
          count: dayReviews.length,
          dayOfWeek: day,
          percentage: Math.round(percentage),
        },
        actionable: true,
        suggestedAction: `Investigate operations on ${day} - possible staffing or capacity issues`,
      });
    }
  }

  return patterns;
}

/**
 * Detect time-of-day patterns
 */
async function detectTimePatterns(
  reviews: Review[],
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  const negativeReviews = reviews.filter((r) => r.rating <= 2);

  if (negativeReviews.length < 3) return patterns;

  // Group by hour ranges
  const hourRanges = {
    morning: { range: [6, 12], reviews: [] as Review[] },
    afternoon: { range: [12, 17], reviews: [] as Review[] },
    evening: { range: [17, 22], reviews: [] as Review[] },
    night: { range: [22, 6], reviews: [] as Review[] },
  };

  negativeReviews.forEach((review) => {
    const date = new Date(review.create_time);
    const hour = date.getHours();

    for (const [period, config] of Object.entries(hourRanges)) {
      const [start, end] = config.range;
      if (
        (start < end && hour >= start && hour < end) ||
        (start > end && (hour >= start || hour < end))
      ) {
        config.reviews.push(review);
        break;
      }
    }
  });

  // Find periods with high concentration
  for (const [period, config] of Object.entries(hourRanges)) {
    if (config.reviews.length >= 2) {
      const percentage = (config.reviews.length / negativeReviews.length) * 100;
      if (percentage > 40) {
        patterns.push({
          type: "time_pattern",
          severity: percentage > 60 ? "high" : "medium",
          title: `High negative reviews during ${period}`,
          description: `${config.reviews.length} negative reviews concentrated in ${period} hours`,
          confidence: Math.min(percentage * 1.5, 85),
          affectedReviews: config.reviews.map((r) => r.id),
          data: {
            count: config.reviews.length,
            timeframe: period,
            percentage: Math.round(percentage),
          },
          actionable: true,
          suggestedAction: `Check staffing and operations during ${period} hours`,
        });
      }
    }
  }

  return patterns;
}

/**
 * Detect rating trends (improving or declining)
 */
async function detectRatingTrends(
  reviews: Review[],
  userId: string,
  locationId?: string,
): Promise<DetectedPattern | null> {
  if (reviews.length < 10) return null;

  // Split into two periods: old vs recent
  const midpoint = Math.floor(reviews.length / 2);
  const recentReviews = reviews.slice(0, midpoint);
  const olderReviews = reviews.slice(midpoint);

  const recentAvg =
    recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
  const olderAvg =
    olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length;

  const diff = recentAvg - olderAvg;

  // Significant change (> 0.3 stars)
  if (Math.abs(diff) > 0.3) {
    const isImproving = diff > 0;
    const severity: "high" | "medium" | "low" =
      Math.abs(diff) >= 0.5 ? "high" : "medium";

    return {
      type: isImproving ? "rating_rise" : "rating_drop",
      severity,
      title: isImproving
        ? "Rating improving - positive trend"
        : "Rating declining - needs attention",
      description: `Average rating ${isImproving ? "increased" : "decreased"} from ${olderAvg.toFixed(1)} to ${recentAvg.toFixed(1)}`,
      confidence: Math.min(Math.abs(diff) * 100, 90),
      affectedReviews: recentReviews.map((r) => r.id),
      data: {
        ratingBefore: Math.round(olderAvg * 10) / 10,
        ratingAfter: Math.round(recentAvg * 10) / 10,
        timeframe: "recent period",
      },
      actionable: !isImproving,
      suggestedAction: isImproving
        ? "Keep up the good work - maintain quality standards"
        : "Investigate recent operational changes - quality may be declining",
    };
  }

  return null;
}

/**
 * Detect service quality issues
 */
async function detectServiceIssues(
  reviews: Review[],
): Promise<DetectedPattern | null> {
  const serviceKeywords = [
    "service",
    "staff",
    "waiter",
    "employee",
    "rude",
    "unprofessional",
    "خدمة",
    "موظف",
    "نادل",
    "وقح",
  ];

  const serviceComplaints = reviews.filter((r) => {
    if (r.rating > 2 || !r.comment) return false;
    const text = r.comment.toLowerCase();
    return serviceKeywords.some((keyword) => text.includes(keyword));
  });

  if (serviceComplaints.length >= 2) {
    const percentage =
      (serviceComplaints.length / reviews.filter((r) => r.rating <= 2).length) *
      100;

    return {
      type: "service_issue",
      severity: serviceComplaints.length >= 3 ? "high" : "medium",
      title: "Service quality concerns detected",
      description: `${serviceComplaints.length} reviews mention service or staff issues`,
      confidence: Math.min(percentage * 1.2, 85),
      affectedReviews: serviceComplaints.map((r) => r.id),
      data: {
        count: serviceComplaints.length,
        keywords: ["service", "staff"],
        percentage: Math.round(percentage),
      },
      actionable: true,
      suggestedAction: "Review staff training and customer service protocols",
    };
  }

  return null;
}

/**
 * Detect product/food quality issues
 */
async function detectProductIssues(
  reviews: Review[],
): Promise<DetectedPattern | null> {
  const qualityKeywords = [
    "quality",
    "cold",
    "bad",
    "taste",
    "food",
    "product",
    "جودة",
    "بارد",
    "طعم",
    "أكل",
  ];

  const qualityComplaints = reviews.filter((r) => {
    if (r.rating > 2 || !r.comment) return false;
    const text = r.comment.toLowerCase();
    return qualityKeywords.some((keyword) => text.includes(keyword));
  });

  if (qualityComplaints.length >= 2) {
    const percentage =
      (qualityComplaints.length / reviews.filter((r) => r.rating <= 2).length) *
      100;

    return {
      type: "product_issue",
      severity: qualityComplaints.length >= 3 ? "high" : "medium",
      title: "Product quality concerns detected",
      description: `${qualityComplaints.length} reviews mention product or quality issues`,
      confidence: Math.min(percentage * 1.2, 85),
      affectedReviews: qualityComplaints.map((r) => r.id),
      data: {
        count: qualityComplaints.length,
        keywords: ["quality", "product"],
        percentage: Math.round(percentage),
      },
      actionable: true,
      suggestedAction:
        "Review product quality standards and preparation processes",
    };
  }

  return null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract common keywords from reviews
 */
export function extractKeywords(reviews: Review[], minCount = 2): string[] {
  const wordCounts: Record<string, number> = {};

  // Common words to ignore
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "is",
    "was",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "في",
    "من",
    "إلى",
    "على",
    "هذا",
    "كان",
  ]);

  reviews.forEach((review) => {
    if (!review.comment) return;
    const words = review.comment
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    words.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
  });

  // Get top keywords
  return Object.entries(wordCounts)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Calculate pattern severity based on multiple factors
 */
export function calculateSeverity(
  count: number,
  totalReviews: number,
  confidence: number,
): "high" | "medium" | "low" {
  const percentage = (count / totalReviews) * 100;

  if (count >= 5 || (percentage > 50 && confidence > 70)) {
    return "high";
  } else if (count >= 3 || (percentage > 30 && confidence > 60)) {
    return "medium";
  }
  return "low";
}
