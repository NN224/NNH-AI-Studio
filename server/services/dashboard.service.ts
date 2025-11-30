/**
 * Dashboard Overview Service
 *
 * Production-ready service for dashboard data aggregation.
 * Uses database-level aggregation to avoid OOM errors with large datasets.
 */

import type { DashboardSnapshot, LocationStatus } from "@/types/dashboard";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// ============================================
// Zod Schemas for Safe Metadata Parsing
// ============================================

const LocationMetadataSchema = z
  .object({
    // Profile completeness
    profileCompleteness: z.number().optional(),
    profile_completeness: z.number().optional(),

    // Pending reviews
    pendingReviews: z.number().optional(),
    pending_reviews: z.number().optional(),

    // Rating info
    average_rating: z.number().optional(),
    rating: z.number().optional(),
    total_reviews: z.number().optional(),
    review_count: z.number().optional(),

    // Sync timestamps
    last_reviews_sync: z.string().optional(),
    lastReviewsSync: z.string().optional(),
    reviews_last_sync: z.string().optional(),
    last_posts_sync: z.string().optional(),
    lastPostsSync: z.string().optional(),
    posts_last_sync: z.string().optional(),
    last_questions_sync: z.string().optional(),
    lastQuestionsSync: z.string().optional(),
    questions_last_sync: z.string().optional(),
    last_automation_sync: z.string().optional(),
    lastAutomationSync: z.string().optional(),
    automation_last_sync: z.string().optional(),

    // Nested insights
    insights: z.unknown().optional(),
    insights_json: z.unknown().optional(),
    insightsJson: z.unknown().optional(),
  })
  .passthrough();

const InsightsSchema = z
  .object({
    pendingReviews: z.number().optional(),
    pending_reviews: z.number().optional(),
  })
  .passthrough();

type LocationMetadata = z.infer<typeof LocationMetadataSchema>;

// ============================================
// Type Definitions
// ============================================

interface ServiceContext {
  supabase: SupabaseClient;
  userId: string;
}

interface LocationRow {
  id: string;
  location_name: string | null;
  gmb_account_id: string | null;
  is_active: boolean | null;
  is_archived: boolean | null;
  last_synced_at: string | null;
  metadata: unknown;
  profile_completeness: number | null;
}

interface AccountRow {
  id: string;
  is_active: boolean | null;
  last_sync: string | null;
}

interface ReviewStatsRow {
  total: number;
  pending: number;
  replied: number;
  flagged: number;
  avg_rating: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
}

interface PostStatsRow {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  failed: number;
  whats_new: number;
  events: number;
  offers: number;
  this_week: number;
}

interface QuestionStatsRow {
  total: number;
  unanswered: number;
  answered: number;
}

interface AutomationSettingRow {
  id: string;
  location_id: string | null;
  is_enabled: boolean | null;
  auto_reply_enabled: boolean | null;
  smart_posting_enabled: boolean | null;
  updated_at: string | null;
}

interface AutomationLogRow {
  id: string;
  location_id: string | null;
  action_type: string | null;
  status: string | null;
  created_at: string | null;
}

interface TaskRow {
  status: string | null;
  created_at: string | null;
}

interface RecentReviewRow {
  id: string;
  location_id: string;
  reviewer_name: string | null;
  rating: number | null;
  review_date: string | null;
}

interface RecentPostRow {
  id: string;
  location_id: string;
  status: string | null;
  published_at: string | null;
  title: string | null;
}

interface RecentQuestionRow {
  id: string;
  location_id: string;
  question_text: string | null;
  created_at: string | null;
  answer_status: string | null;
  upvote_count: number | null;
}

// ============================================
// Helper Functions
// ============================================

function parseMetadataSafe(raw: unknown): LocationMetadata {
  if (!raw) return {};

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  const result = LocationMetadataSchema.safeParse(parsed);
  return result.success ? result.data : {};
}

function parseInsightsSafe(raw: unknown): z.infer<typeof InsightsSchema> {
  if (!raw) return {};

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  const result = InsightsSchema.safeParse(parsed);
  return result.success ? result.data : {};
}

function coerceIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
}

function calculatePercentChange(current: number, previous: number): number {
  const prev = Number.isFinite(previous) ? previous : 0;
  const curr = Number.isFinite(current) ? current : 0;

  if (prev === 0) {
    return curr === 0 ? 0 : 100;
  }

  const change = ((curr - prev) / Math.abs(prev)) * 100;
  return Number.isFinite(change) ? Number(change.toFixed(1)) : 0;
}

function computeHealthScore(params: {
  pendingReviews: number;
  unansweredQuestions: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  staleLocations: number;
}): { score: number; bottlenecks: DashboardSnapshot["bottlenecks"] } {
  const bottlenecks: DashboardSnapshot["bottlenecks"] = [];
  let score = 100;

  if (params.pendingReviews > 0) {
    score -= Math.min(20, params.pendingReviews * 2);
    bottlenecks.push({
      type: "Reviews",
      severity:
        params.pendingReviews > 10
          ? "high"
          : params.pendingReviews > 5
            ? "medium"
            : "low",
      count: params.pendingReviews,
      message: `${params.pendingReviews} review${params.pendingReviews > 1 ? "s" : ""} awaiting response.`,
      link: "/reviews",
    });
  }

  if (params.unansweredQuestions > 0) {
    score -= Math.min(10, params.unansweredQuestions * 3);
    bottlenecks.push({
      type: "Response",
      severity: params.unansweredQuestions > 5 ? "high" : "medium",
      count: params.unansweredQuestions,
      message: `${params.unansweredQuestions} customer question${params.unansweredQuestions > 1 ? "s" : ""} need answering.`,
      link: "/questions",
    });
  }

  if (params.averageRating < 4 && params.totalReviews > 10) {
    score -= 15;
    bottlenecks.push({
      type: "General",
      severity: "high",
      count: 1,
      message: `Average rating (${params.averageRating.toFixed(1)}) is below 4.0. Improve service quality.`,
      link: "/analytics",
    });
  }

  if (params.responseRate < 80 && params.totalReviews > 5) {
    score -= 10;
    bottlenecks.push({
      type: "Response",
      severity: "medium",
      count: 1,
      message: `Response rate (${params.responseRate.toFixed(1)}%) is below target. Aim for 80%+.`,
      link: "/reviews",
    });
  }

  if (params.staleLocations > 0) {
    score -= Math.min(10, params.staleLocations * 2);
    bottlenecks.push({
      type: "Compliance",
      severity: params.staleLocations > 3 ? "high" : "low",
      count: params.staleLocations,
      message: `${params.staleLocations} location${params.staleLocations > 1 ? "s have" : " has"} stale data. Run a sync.`,
      link: "/dashboard",
    });
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clampedScore, bottlenecks };
}

// ============================================
// Database Aggregation Queries
// ============================================

async function getReviewStatsAggregated(
  ctx: ServiceContext,
): Promise<ReviewStatsRow> {
  const { supabase, userId } = ctx;

  // Use database-level aggregation instead of fetching all rows
  const { data, error } = await supabase.rpc("get_review_stats_aggregated", {
    p_user_id: userId,
  });

  if (error || !data) {
    // Fallback to count queries if RPC doesn't exist
    const [
      { count: total },
      { count: pending },
      { count: replied },
      { count: flagged },
      { data: ratingData },
    ] = await Promise.all([
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("has_reply", false),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("has_reply", true),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "flagged"),
      supabase
        .from("gmb_reviews")
        .select("rating, ai_sentiment")
        .eq("user_id", userId),
    ]);

    // Calculate rating distribution and sentiment from fetched data
    const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    let ratingSum = 0;

    for (const row of ratingData ?? []) {
      const r = row.rating;
      if (r >= 1 && r <= 5) {
        ratings[r as 1 | 2 | 3 | 4 | 5]++;
        ratingSum += r;
      }
      const s = row.ai_sentiment as string | null;
      if (s === "positive") sentiments.positive++;
      else if (s === "negative") sentiments.negative++;
      else sentiments.neutral++;
    }

    const totalCount = total ?? 0;
    return {
      total: totalCount,
      pending: pending ?? 0,
      replied: replied ?? 0,
      flagged: flagged ?? 0,
      avg_rating: totalCount > 0 ? ratingSum / totalCount : 0,
      rating_1: ratings[1],
      rating_2: ratings[2],
      rating_3: ratings[3],
      rating_4: ratings[4],
      rating_5: ratings[5],
      sentiment_positive: sentiments.positive,
      sentiment_neutral: sentiments.neutral,
      sentiment_negative: sentiments.negative,
    };
  }

  return data as ReviewStatsRow;
}

async function getPostStatsAggregated(
  ctx: ServiceContext,
): Promise<PostStatsRow> {
  const { supabase, userId } = ctx;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { count: total },
    { count: published },
    { count: drafts },
    { count: scheduled },
    { count: failed },
    { count: whatsNew },
    { count: events },
    { count: offers },
    { count: thisWeek },
  ] = await Promise.all([
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "published"),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "draft"),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "queued"),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "failed"),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("post_type", "whats_new"),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("post_type", "event"),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("post_type", "offer"),
    supabase
      .from("gmb_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("published_at", weekAgo.toISOString()),
  ]);

  return {
    total: total ?? 0,
    published: published ?? 0,
    drafts: drafts ?? 0,
    scheduled: scheduled ?? 0,
    failed: failed ?? 0,
    whats_new: whatsNew ?? 0,
    events: events ?? 0,
    offers: offers ?? 0,
    this_week: thisWeek ?? 0,
  };
}

async function getQuestionStatsAggregated(
  ctx: ServiceContext,
): Promise<QuestionStatsRow> {
  const { supabase, userId } = ctx;

  const [{ count: total }, { count: unanswered }, { count: answered }] =
    await Promise.all([
      supabase
        .from("gmb_questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("gmb_questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("answer_status", ["unanswered", "pending"]),
      supabase
        .from("gmb_questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("answer_status", "answered"),
    ]);

  return {
    total: total ?? 0,
    unanswered: unanswered ?? 0,
    answered: answered ?? 0,
  };
}

async function getMonthlyStatsAggregated(
  ctx: ServiceContext,
): Promise<Array<{ month: string; rating: number; reviews: number }>> {
  const { supabase, userId } = ctx;

  const { data: reviews, error } = await supabase
    .from("gmb_reviews")
    .select("rating, review_date, created_at")
    .eq("user_id", userId)
    .order("review_date", { ascending: true, nullsFirst: false });

  if (error || !reviews) return [];

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthlyData: Record<string, { sum: number; count: number }> = {};

  for (const review of reviews) {
    const dateStr = review.review_date ?? review.created_at;
    if (!dateStr) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { sum: 0, count: 0 };
    }

    monthlyData[monthKey].count += 1;
    monthlyData[monthKey].sum += review.rating ?? 0;
  }

  return Object.entries(monthlyData)
    .map(([monthYear, data]) => {
      const [month, year] = monthYear.split(" ");
      return {
        month: monthYear,
        rating: data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0,
        reviews: data.count,
        sortKey: new Date(`${month} 1, ${year}`).getTime(),
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ month, rating, reviews }) => ({ month, rating, reviews }));
}

// ============================================
// Location Processing (Single Query)
// ============================================

interface ProcessedLocation {
  id: string;
  name: string;
  accountId: string | null;
  status: LocationStatus;
  rating: number | null;
  reviewCount: number;
  profileCompleteness: number | null;
  pendingReviews: number | null;
  lastSync: {
    reviews: string | null;
    posts: string | null;
    questions: string | null;
    automation: string | null;
  };
}

function processLocations(locations: LocationRow[]): ProcessedLocation[] {
  return locations.map((loc) => {
    const metadata = parseMetadataSafe(loc.metadata);
    const insights = parseInsightsSafe(
      metadata.insights ?? metadata.insights_json ?? metadata.insightsJson,
    );

    const profileCompletenessFromColumn =
      typeof loc.profile_completeness === "number"
        ? loc.profile_completeness
        : null;
    const profileCompletenessFromMetadata =
      typeof metadata.profileCompleteness === "number"
        ? metadata.profileCompleteness
        : typeof metadata.profile_completeness === "number"
          ? metadata.profile_completeness
          : null;
    const profileCompleteness =
      profileCompletenessFromColumn ?? profileCompletenessFromMetadata;

    const pendingReviewsFromMetadata =
      typeof metadata.pendingReviews === "number"
        ? metadata.pendingReviews
        : typeof metadata.pending_reviews === "number"
          ? metadata.pending_reviews
          : null;
    const pendingReviewsFromInsights =
      typeof insights.pendingReviews === "number"
        ? insights.pendingReviews
        : typeof insights.pending_reviews === "number"
          ? insights.pending_reviews
          : null;
    const pendingReviews =
      pendingReviewsFromMetadata ?? pendingReviewsFromInsights;

    const status: LocationStatus = loc.is_archived
      ? "archived"
      : loc.is_active === false
        ? "disconnected"
        : "active";

    const reviewsSync = coerceIso(
      metadata.last_reviews_sync ??
        metadata.lastReviewsSync ??
        metadata.reviews_last_sync,
    );
    const postsSync = coerceIso(
      metadata.last_posts_sync ??
        metadata.lastPostsSync ??
        metadata.posts_last_sync,
    );
    const questionsSync = coerceIso(
      metadata.last_questions_sync ??
        metadata.lastQuestionsSync ??
        metadata.questions_last_sync,
    );
    const automationSync = coerceIso(
      metadata.last_automation_sync ??
        metadata.lastAutomationSync ??
        metadata.automation_last_sync,
    );

    const rating =
      typeof metadata.average_rating === "number"
        ? metadata.average_rating
        : typeof metadata.rating === "number"
          ? metadata.rating
          : null;

    const reviewCount =
      typeof metadata.total_reviews === "number"
        ? metadata.total_reviews
        : typeof metadata.review_count === "number"
          ? metadata.review_count
          : 0;

    return {
      id: loc.id,
      name: loc.location_name ?? "Unnamed location",
      accountId: loc.gmb_account_id ?? null,
      status,
      rating,
      reviewCount,
      profileCompleteness,
      pendingReviews,
      lastSync: {
        reviews: reviewsSync ?? coerceIso(loc.last_synced_at),
        posts: postsSync,
        questions: questionsSync,
        automation: automationSync,
      },
    };
  });
}

// ============================================
// Main Service Function
// ============================================

export async function getDashboardOverview(
  ctx: ServiceContext,
): Promise<DashboardSnapshot> {
  const { supabase, userId } = ctx;
  const now = new Date();

  // Batch fetch core data with single queries (no N+1)
  const [
    { data: accountsData },
    { data: locationsData, error: locationsError },
    reviewStats,
    postStats,
    questionStats,
    monthlyData,
  ] = await Promise.all([
    supabase
      .from("gmb_accounts")
      .select("id, is_active, last_sync")
      .eq("user_id", userId),
    supabase
      .from("gmb_locations")
      .select(
        "id, location_name, gmb_account_id, is_active, is_archived, last_synced_at, metadata, profile_completeness",
      )
      .eq("user_id", userId),
    getReviewStatsAggregated(ctx),
    getPostStatsAggregated(ctx),
    getQuestionStatsAggregated(ctx),
    getMonthlyStatsAggregated(ctx),
  ]);

  if (locationsError) {
    throw new Error(`Failed to load locations: ${locationsError.message}`);
  }

  const accounts = (accountsData ?? []) as AccountRow[];
  const locations = (locationsData ?? []) as LocationRow[];
  const locationSummaries = processLocations(locations);

  // Calculate profile completeness average
  const profileCompletenessValues = locationSummaries
    .map((loc) =>
      typeof loc.profileCompleteness === "number"
        ? loc.profileCompleteness
        : null,
    )
    .filter((value): value is number => value !== null && !Number.isNaN(value));
  const profileCompletenessAverage =
    profileCompletenessValues.length > 0
      ? Math.round(
          profileCompletenessValues.reduce((sum, value) => sum + value, 0) /
            profileCompletenessValues.length,
        )
      : null;

  // Calculate location counts
  const totalLocations = locationSummaries.length;
  const activeLocations = locationSummaries.filter(
    (loc) => loc.status === "active",
  ).length;
  const inactiveLocations = totalLocations - activeLocations;

  // Calculate last global sync
  const allSyncTimestamps: number[] = [];
  accounts
    .map((account) => coerceIso(account.last_sync))
    .filter(Boolean)
    .forEach((value) => {
      if (value) allSyncTimestamps.push(new Date(value).getTime());
    });

  locationSummaries.forEach((loc) => {
    Object.values(loc.lastSync)
      .filter(Boolean)
      .forEach((value) => {
        if (value) allSyncTimestamps.push(new Date(value).getTime());
      });
  });

  const lastGlobalSync =
    allSyncTimestamps.length > 0
      ? new Date(Math.max(...allSyncTimestamps)).toISOString()
      : null;

  // Calculate stale locations
  const staleLocations = locationSummaries.filter((loc) => {
    const syncCandidates = [
      loc.lastSync.reviews,
      loc.lastSync.questions,
      loc.lastSync.posts,
      loc.lastSync.automation,
    ].filter(Boolean);

    if (syncCandidates.length === 0) return true;

    const newest = new Date(
      Math.max(...syncCandidates.map((value) => new Date(value!).getTime())),
    );
    const hoursSince = (now.getTime() - newest.getTime()) / (1000 * 60 * 60);
    return hoursSince > 24;
  }).length;

  // Build review stats snapshot
  const responseRate =
    reviewStats.total > 0 ? (reviewStats.replied / reviewStats.total) * 100 : 0;

  const reviewStatsSnapshot: DashboardSnapshot["reviewStats"] = {
    totals: {
      total: reviewStats.total,
      pending: reviewStats.pending,
      replied: reviewStats.replied,
      flagged: reviewStats.flagged,
    },
    byRating: {
      "1": reviewStats.rating_1,
      "2": reviewStats.rating_2,
      "3": reviewStats.rating_3,
      "4": reviewStats.rating_4,
      "5": reviewStats.rating_5,
    },
    bySentiment: {
      positive: reviewStats.sentiment_positive,
      neutral: reviewStats.sentiment_neutral,
      negative: reviewStats.sentiment_negative,
    },
    averageRating: reviewStats.avg_rating,
    responseRate,
    lastSync:
      locationSummaries
        .map((loc) => loc.lastSync.reviews)
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    recentHighlights: [],
  };

  // Build post stats snapshot
  const postStatsSnapshot: DashboardSnapshot["postStats"] = {
    totals: {
      total: postStats.total,
      published: postStats.published,
      drafts: postStats.drafts,
      scheduled: postStats.scheduled,
      failed: postStats.failed,
    },
    byType: {
      whats_new: postStats.whats_new,
      event: postStats.events,
      offer: postStats.offers,
    },
    thisWeek: postStats.this_week,
    lastSync:
      locationSummaries
        .map((loc) => loc.lastSync.posts)
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    recentPosts: [],
  };

  // Build question stats snapshot
  const answerRate =
    questionStats.total > 0
      ? (questionStats.answered / questionStats.total) * 100
      : 0;

  const questionStatsSnapshot: DashboardSnapshot["questionStats"] = {
    totals: {
      total: questionStats.total,
      unanswered: questionStats.unanswered,
      answered: questionStats.answered,
    },
    byStatus: {
      pending: questionStats.unanswered,
      answered: questionStats.answered,
      hidden: 0,
    },
    answerRate,
    lastSync:
      locationSummaries
        .map((loc) => loc.lastSync.questions)
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    recentQuestions: [],
  };

  // Calculate monthly comparison
  let monthlyComparison: DashboardSnapshot["monthlyComparison"] = null;
  let reviewTrendPct = 0;
  let ratingTrendPct = 0;

  if (monthlyData.length > 0) {
    const latestEntry = monthlyData[monthlyData.length - 1];
    const previousEntry =
      monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

    monthlyComparison = {
      current: {
        reviews: latestEntry?.reviews ?? 0,
        rating: latestEntry?.rating ?? 0,
        questions: questionStatsSnapshot.totals.total,
      },
      previous: {
        reviews: previousEntry?.reviews ?? latestEntry?.reviews ?? 0,
        rating: previousEntry?.rating ?? latestEntry?.rating ?? 0,
        questions: questionStatsSnapshot.totals.total,
      },
    };

    reviewTrendPct = calculatePercentChange(
      monthlyComparison.current.reviews,
      monthlyComparison.previous.reviews,
    );

    const ratingDelta =
      (monthlyComparison.current.rating ?? 0) -
      (monthlyComparison.previous.rating ?? 0);
    ratingTrendPct = Number(((ratingDelta / 5) * 100).toFixed(1));
  }

  // Fetch recent items and automation data in parallel
  const locationIds = locationSummaries.map((loc) => loc.id);

  const [
    recentReviewsQuery,
    recentPostsQuery,
    recentQuestionsQuery,
    automationSettingsQuery,
    automationLogsQuery,
    tasksQuery,
  ] = await Promise.all([
    supabase
      .from("gmb_reviews")
      .select("id, location_id, reviewer_name, rating, review_date")
      .eq("user_id", userId)
      .order("review_date", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("gmb_posts")
      .select("id, location_id, status, published_at, title")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("gmb_questions")
      .select(
        "id, location_id, question_text, created_at, answer_status, upvote_count",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("autopilot_settings")
      .select(
        "id, location_id, is_enabled, auto_reply_enabled, smart_posting_enabled, updated_at",
      )
      .eq("user_id", userId),
    locationIds.length > 0
      ? supabase
          .from("autopilot_logs")
          .select("id, location_id, action_type, status, created_at")
          .in("location_id", locationIds)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as AutomationLogRow[], error: null }),
    supabase
      .from("weekly_task_recommendations")
      .select("status, created_at")
      .eq("user_id", userId)
      .order("week_start_date", { ascending: false })
      .limit(100),
  ]);

  // Process recent reviews
  if (!recentReviewsQuery.error && recentReviewsQuery.data) {
    reviewStatsSnapshot.recentHighlights = (
      recentReviewsQuery.data as RecentReviewRow[]
    ).map((item) => ({
      reviewId: item.id,
      locationId: item.location_id,
      reviewer: item.reviewer_name ?? "Anonymous",
      rating: item.rating ?? 0,
      createdAt: coerceIso(item.review_date),
    }));
  }

  // Process recent posts
  if (!recentPostsQuery.error && recentPostsQuery.data) {
    postStatsSnapshot.recentPosts = (
      recentPostsQuery.data as RecentPostRow[]
    ).map((item) => ({
      id: item.id,
      locationId: item.location_id,
      status: (item.status ?? "draft") as
        | "draft"
        | "queued"
        | "published"
        | "failed",
      publishedAt: coerceIso(item.published_at),
      title: item.title ?? null,
    }));
  }

  // Process recent questions
  if (!recentQuestionsQuery.error && recentQuestionsQuery.data) {
    questionStatsSnapshot.recentQuestions = (
      recentQuestionsQuery.data as RecentQuestionRow[]
    ).map((item) => ({
      id: item.id,
      locationId: item.location_id,
      questionText: item.question_text ?? "",
      createdAt: coerceIso(item.created_at),
      answerStatus: item.answer_status ?? null,
      upvoteCount: item.upvote_count ?? 0,
    }));
  }

  // Process automation stats
  const automationSettings = (automationSettingsQuery.data ??
    []) as AutomationSettingRow[];
  const automationLogs = (automationLogsQuery?.data ??
    []) as AutomationLogRow[];

  const activeAutomations = automationSettings.filter(
    (item) => item.is_enabled,
  ).length;
  const pausedAutomations = automationSettings.length - activeAutomations;
  const autoReplyEnabled = automationSettings.filter(
    (item) => item.auto_reply_enabled,
  ).length;
  const latestAutomationRun =
    automationLogs.length > 0 ? coerceIso(automationLogs[0].created_at) : null;
  const automationSuccessRate =
    automationLogs.length > 0
      ? Math.round(
          (automationLogs.filter((log) => log.status === "success").length /
            automationLogs.length) *
            100,
        )
      : null;

  const automationStatsSnapshot: DashboardSnapshot["automationStats"] = {
    totalAutomations: automationSettings.length,
    activeAutomations,
    pausedAutomations,
    autoReplyEnabled,
    successRatePct: automationSuccessRate,
    lastRunAt: latestAutomationRun,
    lastSync:
      automationSettings
        .map((item) => coerceIso(item.updated_at))
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    recentLogs: automationLogs.map((log) => ({
      id: log.id,
      locationId: log.location_id,
      actionType: log.action_type,
      status: log.status,
      createdAt: coerceIso(log.created_at) ?? now.toISOString(),
    })),
  };

  // Process tasks summary
  let tasksSummary: DashboardSnapshot["tasksSummary"] = {
    weeklyTasksGenerated: false,
    pendingTasks: 0,
    completedTasks: 0,
    lastGeneratedAt: null,
  };

  if (!tasksQuery.error && tasksQuery.data) {
    const tasksData = tasksQuery.data as TaskRow[];
    const pendingTasks = tasksData.filter(
      (task) => task.status !== "completed",
    ).length;
    const completedTasks = tasksData.filter(
      (task) => task.status === "completed",
    ).length;

    const validDates = tasksData
      .map((task) => coerceIso(task.created_at))
      .filter(Boolean)
      .map((value) => new Date(value!).getTime());

    const lastGenerated =
      validDates.length > 0
        ? new Date(Math.max(...validDates)).toISOString()
        : null;

    tasksSummary = {
      weeklyTasksGenerated: tasksData.length > 0,
      pendingTasks,
      completedTasks,
      lastGeneratedAt: lastGenerated,
    };
  }

  // Calculate location highlights
  const activeLocationsList = locationSummaries.filter(
    (loc) => loc.status === "active",
  );
  const highlights: NonNullable<DashboardSnapshot["locationHighlights"]> = [];

  const getRatingValue = (location: ProcessedLocation) => {
    if (typeof location.rating === "number") {
      return location.rating;
    }
    return reviewStatsSnapshot.averageRating ?? 0;
  };

  const rankedByRating = [...activeLocationsList].sort(
    (a, b) => getRatingValue(b) - getRatingValue(a),
  );
  const rankedByLowestRating = [...activeLocationsList].sort(
    (a, b) => getRatingValue(a) - getRatingValue(b),
  );
  const rankedByReviews = [...activeLocationsList].sort(
    (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
  );

  const ensureHighlight = (
    location: ProcessedLocation | undefined,
    category: "top" | "attention" | "improved",
    ratingDelta?: number,
  ) => {
    if (!location) return;
    if (highlights.some((highlight) => highlight?.id === location.id)) {
      return;
    }

    highlights.push({
      id: location.id,
      name: location.name,
      rating:
        typeof location.rating === "number"
          ? location.rating
          : reviewStatsSnapshot.averageRating,
      reviewCount: location.reviewCount,
      pendingReviews:
        typeof location.pendingReviews === "number"
          ? location.pendingReviews
          : 0,
      category,
      ratingChange: ratingDelta,
    });
  };

  const ratingTrendDelta = monthlyComparison
    ? (monthlyComparison.current.rating ?? 0) -
      (monthlyComparison.previous?.rating ?? 0)
    : undefined;

  ensureHighlight(rankedByRating[0], "top", ratingTrendDelta);
  ensureHighlight(rankedByLowestRating[0], "attention");
  ensureHighlight(
    rankedByReviews.find((loc) => (loc.reviewCount ?? 0) > 0) ??
      rankedByReviews[0],
    "improved",
  );

  if (highlights.length === 0 && activeLocationsList.length > 0) {
    ensureHighlight(activeLocationsList[0], "top", ratingTrendDelta);
  }

  // Compute health score
  const { score: healthScore, bottlenecks: computedBottlenecks } =
    computeHealthScore({
      pendingReviews: reviewStatsSnapshot.totals.pending,
      unansweredQuestions: questionStatsSnapshot.totals.unanswered,
      averageRating: reviewStatsSnapshot.averageRating,
      totalReviews: reviewStatsSnapshot.totals.total,
      responseRate: reviewStatsSnapshot.responseRate,
      staleLocations,
    });

  // Build final snapshot
  const snapshot: DashboardSnapshot = {
    generatedAt: now.toISOString(),
    userId,
    locationSummary: {
      totalLocations,
      activeLocations,
      inactiveLocations,
      lastGlobalSync,
      profileCompletenessAverage,
      locations: locationSummaries,
    },
    kpis: {
      healthScore,
      responseRate: reviewStatsSnapshot.responseRate,
      reviewTrendPct,
      ratingTrendPct,
      totalReviews: reviewStatsSnapshot.totals.total,
      unansweredQuestions: questionStatsSnapshot.totals.unanswered,
      pendingReviews: reviewStatsSnapshot.totals.pending,
      automationActiveCount: automationStatsSnapshot.activeAutomations,
    },
    reviewStats: reviewStatsSnapshot,
    postStats: postStatsSnapshot,
    questionStats: questionStatsSnapshot,
    monthlyComparison,
    locationHighlights: highlights.length > 0 ? highlights : undefined,
    automationStats: automationStatsSnapshot,
    tasksSummary,
    bottlenecks: computedBottlenecks,
  };

  return snapshot;
}
