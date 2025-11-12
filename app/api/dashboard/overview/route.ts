import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getReviewStats } from '@/server/actions/reviews-management';
import { getPostStats } from '@/server/actions/posts-management';
import { getQuestionStats } from '@/server/actions/questions-management';
import { getMonthlyStats } from '@/server/actions/dashboard';
import type { DashboardSnapshot, LocationStatus } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

function parseMetadata(raw: unknown): Record<string, any> {
  if (!raw) {
    return {};
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, any>;
    } catch {
      return {};
    }
  }

  if (typeof raw === 'object') {
    return raw as Record<string, any>;
  }

  return {};
}

function coerceIso(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
}

function computeHealthScore(params: {
  pendingReviews: number;
  unansweredQuestions: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  staleLocations: number;
}): { score: number; bottlenecks: DashboardSnapshot['bottlenecks'] } {
  const bottlenecks: DashboardSnapshot['bottlenecks'] = [];
  let score = 100;

  if (params.pendingReviews > 0) {
    score -= Math.min(20, params.pendingReviews * 2);
    bottlenecks.push({
      type: 'Reviews',
      severity: params.pendingReviews > 10 ? 'high' : params.pendingReviews > 5 ? 'medium' : 'low',
      count: params.pendingReviews,
      message: `${params.pendingReviews} review${params.pendingReviews > 1 ? 's' : ''} awaiting response.`,
      link: '/reviews',
    });
  }

  if (params.unansweredQuestions > 0) {
    score -= Math.min(10, params.unansweredQuestions * 3);
    bottlenecks.push({
      type: 'Response',
      severity: params.unansweredQuestions > 5 ? 'high' : 'medium',
      count: params.unansweredQuestions,
      message: `${params.unansweredQuestions} customer question${params.unansweredQuestions > 1 ? 's' : ''} need answering.`,
      link: '/questions',
    });
  }

  if (params.averageRating < 4 && params.totalReviews > 10) {
    score -= 15;
    bottlenecks.push({
      type: 'General',
      severity: 'high',
      count: 1,
      message: `Average rating (${params.averageRating.toFixed(1)}) is below 4.0. Improve service quality.`,
      link: '/analytics',
    });
  }

  if (params.responseRate < 80 && params.totalReviews > 5) {
    score -= 10;
    bottlenecks.push({
      type: 'Response',
      severity: 'medium',
      count: 1,
      message: `Response rate (${params.responseRate.toFixed(1)}%) is below target. Aim for 80%+.`,
      link: '/reviews',
    });
  }

  if (params.staleLocations > 0) {
    score -= Math.min(10, params.staleLocations * 2);
    bottlenecks.push({
      type: 'Compliance',
      severity: params.staleLocations > 3 ? 'high' : 'low',
      count: params.staleLocations,
      message: `${params.staleLocations} location${params.staleLocations > 1 ? 's have' : ' has'} stale data. Run a sync.`,
      link: '/dashboard',
    });
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clampedScore, bottlenecks };
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

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required. Please sign in again.',
        },
        { status: 401 },
      );
    }

    const { success: rateLimitOK, headers } = await checkRateLimit(user.id);
    if (!rateLimitOK) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retry_after: headers['X-RateLimit-Reset'],
        },
        {
          status: 429,
          headers: headers as HeadersInit,
        },
      );
    }

    const now = new Date();

    const [{ data: accountsData }, { data: locationsData, error: locationsError }] =
      await Promise.all([
        supabase
          .from('gmb_accounts')
          .select('id, is_active, last_sync')
          .eq('user_id', user.id),
        supabase
          .from('gmb_locations')
          .select(
            'id, location_name, gmb_account_id, is_active, is_archived, last_synced_at, metadata, profile_completeness',
          )
          .eq('user_id', user.id),
      ]);

    if (locationsError) {
      console.error('[Dashboard Overview] Failed to load locations', locationsError);
      return NextResponse.json(
        { error: 'Failed to load locations for dashboard overview' },
        { status: 500 },
      );
    }

    const locationSummaries =
      locationsData?.map((loc) => {
        const metadata = parseMetadata((loc as any).metadata);
        const profileCompletenessFromColumn = typeof (loc as any).profile_completeness === 'number'
          ? (loc as any).profile_completeness
          : null;
        const profileCompletenessFromMetadata = typeof metadata.profileCompleteness === 'number'
          ? metadata.profileCompleteness
          : typeof metadata.profile_completeness === 'number'
          ? metadata.profile_completeness
          : null;
        const profileCompleteness = profileCompletenessFromColumn ?? profileCompletenessFromMetadata;

        const status: LocationStatus = loc.is_archived
          ? 'archived'
          : loc.is_active === false
          ? 'disconnected'
          : 'active';

        const reviewsSync = coerceIso(
          metadata.last_reviews_sync ?? metadata.lastReviewsSync ?? metadata.reviews_last_sync,
        );
        const postsSync = coerceIso(
          metadata.last_posts_sync ?? metadata.lastPostsSync ?? metadata.posts_last_sync,
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
          typeof metadata.average_rating === 'number'
            ? metadata.average_rating
            : typeof metadata.rating === 'number'
            ? metadata.rating
            : null;

        const reviewCount =
          typeof metadata.total_reviews === 'number'
            ? metadata.total_reviews
            : typeof metadata.review_count === 'number'
            ? metadata.review_count
            : 0;

        return {
          id: loc.id,
          name: loc.location_name ?? 'Unnamed location',
          accountId: loc.gmb_account_id ?? null,
          status,
          rating,
          reviewCount,
          profileCompleteness,
          lastSync: {
            reviews: reviewsSync ?? coerceIso(loc.last_synced_at),
            posts: postsSync,
            questions: questionsSync,
            automation: automationSync,
          },
        };
      }) ?? [];

    const profileCompletenessValues = locationSummaries
      .map((loc) => (typeof loc.profileCompleteness === 'number' ? loc.profileCompleteness : null))
      .filter((value): value is number => value !== null && !Number.isNaN(value));
    const profileCompletenessAverage = profileCompletenessValues.length > 0
      ? Math.round(
          profileCompletenessValues.reduce((sum, value) => sum + value, 0) /
            profileCompletenessValues.length,
        )
      : null;

    const totalLocations = locationSummaries.length;
    const activeLocations = locationSummaries.filter((loc) => loc.status === 'active').length;
    const inactiveLocations = totalLocations - activeLocations;

    const allSyncTimestamps: number[] = [];
    accountsData
      ?.map((account) => coerceIso((account as any).last_sync))
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
      allSyncTimestamps.length > 0 ? new Date(Math.max(...allSyncTimestamps)).toISOString() : null;

    const staleLocations = locationSummaries.filter((loc) => {
      const syncCandidates = [
        loc.lastSync.reviews,
        loc.lastSync.questions,
        loc.lastSync.posts,
        loc.lastSync.automation,
      ].filter(Boolean);

      if (syncCandidates.length === 0) return true;

      const newest = new Date(Math.max(...syncCandidates.map((value) => new Date(value!).getTime())));
      const hoursSince = (now.getTime() - newest.getTime()) / (1000 * 60 * 60);
      return hoursSince > 24;
    }).length;

    const [reviewStatsResult, postStatsResult, questionStatsResult] = await Promise.all([
      getReviewStats(),
      getPostStats(),
      getQuestionStats(),
    ]);

    const reviewStatsData = reviewStatsResult.success ? reviewStatsResult.data : null;
    const postStatsData = postStatsResult.success ? postStatsResult.stats : null;
    const questionStatsData = questionStatsResult.success ? questionStatsResult.data : null;

    const reviewCountTotals = reviewStatsData?.byRating ?? {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    const sentimentTotals = reviewStatsData?.bySentiment ?? {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    const reviewStatsSnapshot: DashboardSnapshot['reviewStats'] = {
      totals: {
        total: reviewStatsData?.total ?? 0,
        pending: reviewStatsData?.pending ?? 0,
        replied: reviewStatsData?.replied ?? 0,
        flagged: reviewStatsData?.flagged ?? 0,
      },
      byRating: {
        '1': reviewCountTotals[1] ?? 0,
        '2': reviewCountTotals[2] ?? 0,
        '3': reviewCountTotals[3] ?? 0,
        '4': reviewCountTotals[4] ?? 0,
        '5': reviewCountTotals[5] ?? 0,
      },
      bySentiment: {
        positive: sentimentTotals.positive ?? 0,
        neutral: sentimentTotals.neutral ?? 0,
        negative: sentimentTotals.negative ?? 0,
      },
      averageRating: reviewStatsData?.averageRating ?? 0,
      responseRate: reviewStatsData?.responseRate ?? 0,
      lastSync:
        locationSummaries
          .map((loc) => loc.lastSync.reviews)
          .filter(Boolean)
          .sort()
          .pop() ?? null,
      recentHighlights: [],
    };

    const postStatsSnapshot: DashboardSnapshot['postStats'] = {
      totals: {
        total: postStatsData?.total ?? 0,
        published: postStatsData?.published ?? 0,
        drafts: postStatsData?.drafts ?? 0,
        scheduled: postStatsData?.scheduled ?? 0,
        failed: postStatsData?.failed ?? 0,
      },
      byType: {
        whats_new: postStatsData?.whatsNew ?? 0,
        event: postStatsData?.events ?? 0,
        offer: postStatsData?.offers ?? 0,
      },
      thisWeek: postStatsData?.thisWeek ?? 0,
      lastSync:
        locationSummaries
          .map((loc) => loc.lastSync.posts)
          .filter(Boolean)
          .sort()
          .pop() ?? null,
      recentPosts: [],
    };

    const questionStatsSnapshot: DashboardSnapshot['questionStats'] = {
      totals: {
        total: questionStatsData?.total ?? 0,
        unanswered: questionStatsData?.unanswered ?? 0,
        answered: questionStatsData?.answered ?? 0,
      },
      byPriority: {
        urgent: questionStatsData?.byPriority?.urgent ?? 0,
        high: questionStatsData?.byPriority?.high ?? 0,
        medium: questionStatsData?.byPriority?.medium ?? 0,
        low: questionStatsData?.byPriority?.low ?? 0,
      },
      byStatus: {
        pending: (questionStatsData?.byPriority?.urgent ?? 0) + (questionStatsData?.byPriority?.high ?? 0) + (questionStatsData?.byPriority?.medium ?? 0) + (questionStatsData?.byPriority?.low ?? 0) - (questionStatsData?.answered ?? 0),
        answered: questionStatsData?.answered ?? 0,
        hidden: 0,
      },
      answerRate: questionStatsData?.answerRate ?? 0,
      lastSync:
        locationSummaries
          .map((loc) => loc.lastSync.questions)
          .filter(Boolean)
          .sort()
          .pop() ?? null,
      recentQuestions: [],
    };

    const monthlyStatsResult = await getMonthlyStats();
    const monthlyData = monthlyStatsResult.data ?? [];

    let monthlyComparison: DashboardSnapshot['monthlyComparison'] = null;
    let reviewTrendPct = 0;
    let ratingTrendPct = 0;

    if (monthlyData.length > 0) {
      const latestEntry = monthlyData[monthlyData.length - 1];
      const previousEntry = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

      monthlyComparison = {
        current: {
          reviews: latestEntry?.reviews ?? 0,
          rating: latestEntry?.rating ?? 0,
          questions: questionStatsSnapshot.totals.total ?? 0,
        },
        previous: {
          reviews: previousEntry?.reviews ?? latestEntry?.reviews ?? 0,
          rating: previousEntry?.rating ?? latestEntry?.rating ?? 0,
          questions: questionStatsSnapshot.totals.total ?? 0,
        },
      };

      const currentReviewTotal = monthlyComparison.current.reviews ?? 0;
      const previousReviewTotal = monthlyComparison.previous?.reviews ?? 0;
      reviewTrendPct = calculatePercentChange(currentReviewTotal, previousReviewTotal);

      const currentAverageRating = monthlyComparison.current.rating ?? 0;
      const previousAverageRating = monthlyComparison.previous?.rating ?? 0;
      const ratingDelta = currentAverageRating - previousAverageRating;
      ratingTrendPct = Number((((ratingDelta / 5) * 100)).toFixed(1));
    }

    const activeLocationsList = locationSummaries.filter((loc) => loc.status === 'active');
    const highlights: NonNullable<DashboardSnapshot['locationHighlights']> = [];

    const rankedByRating = [...activeLocationsList].filter((loc) => typeof loc.rating === 'number').sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const rankedByLowestRating = [...activeLocationsList].filter((loc) => typeof loc.rating === 'number').sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5));
    const rankedByReviews = [...activeLocationsList].sort((a, b) => b.reviewCount - a.reviewCount);

    const ensureHighlight = (
      location: (typeof locationSummaries)[number] | undefined,
      category: 'top' | 'attention' | 'improved',
      ratingDelta?: number,
    ) => {
      if (!location) return;
      if (highlights.some((highlight) => highlight?.id === location.id)) {
        return;
      }

      highlights.push({
        id: location.id,
        name: location.name,
        rating: typeof location.rating === 'number' ? location.rating : reviewStatsSnapshot.averageRating,
        reviewCount: location.reviewCount,
        pendingReviews: 0,
        category,
        ratingChange: ratingDelta,
      });
    };

    const ratingTrendDelta = monthlyComparison
      ? (monthlyComparison.current.rating ?? 0) - (monthlyComparison.previous?.rating ?? 0)
      : undefined;

    ensureHighlight(rankedByRating[0], 'top', ratingTrendDelta);
    ensureHighlight(rankedByLowestRating[0], 'attention');
    ensureHighlight(rankedByReviews.find((loc) => loc.reviewCount > 0), 'improved');

    const [recentReviewsQuery, recentPostsQuery, recentQuestionsQuery] = await Promise.all([
      supabase
        .from('gmb_reviews')
        .select('id, location_id, reviewer_name, rating, review_date')
        .eq('user_id', user.id)
        .order('review_date', { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from('gmb_posts')
        .select('id, location_id, status, published_at, title, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('gmb_questions')
        .select('id, location_id, question_text, created_at, answer_status, upvote_count, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (!recentReviewsQuery.error && recentReviewsQuery.data) {
      reviewStatsSnapshot.recentHighlights = recentReviewsQuery.data.map((item) => ({
        reviewId: item.id,
        locationId: item.location_id,
        reviewer: item.reviewer_name ?? 'Anonymous',
        rating: item.rating ?? 0,
        createdAt: coerceIso(item.review_date),
      }));
    }

    if (!recentPostsQuery.error && recentPostsQuery.data) {
      postStatsSnapshot.recentPosts = recentPostsQuery.data.map((item) => ({
        id: item.id,
        locationId: item.location_id,
        status: item.status as 'draft' | 'queued' | 'published' | 'failed',
        publishedAt: coerceIso(item.published_at),
        title: item.title ?? null,
      }));
    }

    if (!recentQuestionsQuery.error && recentQuestionsQuery.data) {
      questionStatsSnapshot.recentQuestions = recentQuestionsQuery.data.map((item) => ({
        id: item.id,
        locationId: item.location_id,
        questionText: item.question_text ?? '',
        createdAt: coerceIso(item.created_at),
        answerStatus: item.answer_status ?? null,
        upvoteCount: item.upvote_count ?? 0,
      }));
    }

    const [automationSettingsQuery, automationLogsQuery] = await Promise.all([
      supabase
        .from('autopilot_settings')
        .select(
          'id, location_id, is_enabled, auto_reply_enabled, smart_posting_enabled, updated_at, user_id',
        )
        .eq('user_id', user.id),
      locationSummaries.length > 0
        ? supabase
            .from('autopilot_logs')
            .select('id, location_id, action_type, status, created_at')
            .in(
              'location_id',
              locationSummaries.map((loc) => loc.id),
            )
            .order('created_at', { ascending: false })
            .limit(50)
        : { data: [] as any[], error: null },
    ]);

    const automationSettings = automationSettingsQuery.data ?? [];
    const automationLogs = automationLogsQuery?.data ?? [];

    const activeAutomations = automationSettings.filter((item) => item.is_enabled).length;
    const pausedAutomations = automationSettings.length - activeAutomations;
    const autoReplyEnabled = automationSettings.filter((item) => item.auto_reply_enabled).length;
    const latestAutomationRun =
      automationLogs.length > 0 ? coerceIso(automationLogs[0].created_at) : null;
    const automationSuccessRate =
      automationLogs.length > 0
        ? Math.round(
            (automationLogs.filter((log) => log.status === 'success').length /
              automationLogs.length) *
              100,
          )
        : null;

    const automationStatsSnapshot: DashboardSnapshot['automationStats'] = {
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
        createdAt: coerceIso(log.created_at) ?? new Date().toISOString(),
      })),
    };

    let tasksSummary: DashboardSnapshot['tasksSummary'] = {
      weeklyTasksGenerated: false,
      pendingTasks: 0,
      completedTasks: 0,
      lastGeneratedAt: null,
    };

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('weekly_task_recommendations')
        .select('status, created_at')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false })
        .limit(100);

      if (!tasksError && tasksData) {
        const pendingTasks = tasksData.filter((task) => task.status !== 'completed').length;
        const completedTasks = tasksData.filter((task) => task.status === 'completed').length;
        const lastGenerated =
          tasksData.length > 0
            ? new Date(
                Math.max.apply(
                  null,
                  tasksData
                    .map((task) => coerceIso(task.created_at))
                    .filter(Boolean)
                    .map((value) => new Date(value!).getTime()),
                ),
              ).toISOString()
            : null;

        tasksSummary = {
          weeklyTasksGenerated: tasksData.length > 0,
          pendingTasks,
          completedTasks,
          lastGeneratedAt: lastGenerated,
        };
      } else if (tasksError && tasksError.code !== 'PGRST116') {
        console.error('[Dashboard Overview] Failed to load weekly tasks', tasksError);
      }
    } catch (taskError) {
      console.warn('[Dashboard Overview] Weekly tasks table unavailable', taskError);
    }

    const { score: healthScore, bottlenecks: computedBottlenecks } = computeHealthScore({
      pendingReviews: reviewStatsSnapshot.totals.pending,
      unansweredQuestions: questionStatsSnapshot.totals.unanswered,
      averageRating: reviewStatsSnapshot.averageRating,
      totalReviews: reviewStatsSnapshot.totals.total,
      responseRate: reviewStatsSnapshot.responseRate,
      staleLocations,
    });

    const snapshot: DashboardSnapshot = {
      generatedAt: now.toISOString(),
      userId: user.id,
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

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('[Dashboard Overview] Unexpected error', error);
    return NextResponse.json(
      {
        error: 'Unexpected error while building dashboard overview',
      },
      { status: 500 },
    );
  }
}

