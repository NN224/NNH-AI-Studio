// app/api/dashboard/stats/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

// Input validation schema with enhanced security
const dateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
}).refine((data) => {
  if (!data.start || !data.end) return true;
  
  const start = new Date(data.start);
  const end = new Date(data.end);
  const now = new Date();
  
  // Validate dates are not in the future
  if (start > now || end > now) {
    throw new Error('Date range cannot be in the future');
  }
  
  // Validate start is before end
  if (start > end) {
    throw new Error('Start date must be before end date');
  }
  
  // Limit range to 90 days for performance (reduced from 365)
  const maxRange = 90 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRange) {
    throw new Error('Date range cannot exceed 90 days');
  }
  
  // Validate dates are not too far in the past (e.g., 2 years)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  if (start < twoYearsAgo) {
    throw new Error('Start date cannot be more than 2 years ago');
  }
  
  return true;
}, {
  message: 'Invalid date range',
});

// ⭐️ واجهة جديدة لتمثيل حالة عنق الزجاجة (Bottleneck)
interface Bottleneck {
  type: 'Response' | 'Content' | 'Compliance' | 'Reviews' | 'General';
  count: number;
  message: string;
  link: string;
  severity: 'low' | 'medium' | 'high';
}

// تعريف الواجهة المتوقعة للبيانات المعالجة (محدثة)
interface ProcessedStats {
  totalLocations: number;
  locationsTrend: number;
  recentAverageRating: number;
  allTimeAverageRating: number;
  ratingTrend: number;
  totalReviews: number;
  reviewsTrend: number;
  responseRate: number;
  pendingReviews: number;
  unansweredQuestions: number;
  // حقول الذكاء الاصطناعي الجديدة
  healthScore: number;
  bottlenecks: Bottleneck[];
  // بيانات المقارنة الشهرية
  monthlyComparison: {
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
  };
  // أبرز المواقع
  locationHighlights: Array<{
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    pendingReviews: number;
    ratingChange?: number;
    category: 'top' | 'attention' | 'improved';
  }>;
}

/**
 * دالة مسار API لجلب الإحصائيات المعالجة للوحة التحكم.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // ✅ SECURITY: Enhanced authentication validation
  // Using getUser() instead of getSession() for secure authentication
  // getUser() validates against Supabase Auth server, preventing cookie tampering
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== 'AuthSessionMissingError') {
      console.error('Authentication error:', authError);
    }
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        message: 'Authentication required. Please sign in again.'
      }, 
      { status: 401 }
    );
  }

  // ✅ SECURITY: Rate limiting check
  const { success, headers } = await checkRateLimit(user.id);
  if (!success) {
    return NextResponse.json(
      { 
        error: 'Too many requests', 
        message: 'Rate limit exceeded. Please try again later.',
        retry_after: headers['X-RateLimit-Reset']
      },
      { 
        status: 429,
        headers: headers as HeadersInit
      }
    );
  }

  try {
  const userId = user.id;
  // فترات زمنية ديناميكية حسب بارامترات الطلب (start/end)
  const url = new URL(request.url);
  
  // ✅ Validate input with Zod
  const validation = dateRangeSchema.safeParse({
    start: url.searchParams.get('start'),
    end: url.searchParams.get('end'),
  });

  if (!validation.success) {
    return NextResponse.json(
      { 
        error: 'Invalid input',
        details: validation.error.issues,
        message: validation.error.issues[0]?.message || 'Invalid date range parameters'
      },
      { status: 400 }
    );
  }

  const { start: startParam, end: endParam } = validation.data;
  const now = endParam ? new Date(endParam) : new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  const startCandidate = startParam ? new Date(startParam) : defaultStart;
  const startOfPeriod = new Date(startCandidate.getFullYear(), startCandidate.getMonth(), startCandidate.getDate());
  const endOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const msInDay = 1000 * 60 * 60 * 24;
  const periodDays = Math.max(1, Math.ceil((endOfPeriod.getTime() - startOfPeriod.getTime()) / msInDay));
  const prevEnd = new Date(startOfPeriod.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - (periodDays * msInDay) + 1);

    // ... (منطق جلب الحسابات والمواقع النشطة) ...
    const { data: activeAccounts } = await supabase
        .from("gmb_accounts")
        .select("id, last_sync") // جلب آخر مزامنة
        .eq("user_id", userId)
        .eq("is_active", true);

    const activeAccount = activeAccounts?.[0]; // افتراض حساب واحد نشط

    const activeAccountIds = activeAccounts?.map(acc => acc.id) || [];

  const { data: activeLocationsData } = await supabase
    .from("gmb_locations")
    .select("id, created_at, location_name, rating")
        .eq("user_id", userId)
        .in("gmb_account_id", activeAccountIds);

    const activeLocationIds = activeLocationsData?.map(loc => loc.id) || [];
    const totalLocations = activeLocationsData?.length || 0;

    // ✅ SECURITY: Validate location IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validLocationIds = activeLocationIds.filter(id => uuidRegex.test(id));

    if (validLocationIds.length !== activeLocationIds.length) {
      console.error('Invalid location IDs detected');
      return NextResponse.json(
        { error: 'Invalid location data' },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Limit array size to prevent query errors
    const MAX_LOCATIONS = 1000;
    if (validLocationIds.length > MAX_LOCATIONS) {
      console.error(`Too many locations: ${validLocationIds.length}`);
      return NextResponse.json(
        { 
          error: 'Too many locations',
          message: `Maximum ${MAX_LOCATIONS} locations supported`
        },
        { status: 400 }
      );
    }

    // ... (منطق إرجاع الصفر في حالة عدم وجود مواقع) ...
    if (validLocationIds.length === 0) {
        const zeroStats: ProcessedStats = {
            totalLocations: 0, locationsTrend: 0, recentAverageRating: 0, allTimeAverageRating: 0, ratingTrend: 0,
            totalReviews: 0, reviewsTrend: 0, responseRate: 0, pendingReviews: 0, unansweredQuestions: 0,
            healthScore: 0, bottlenecks: [],
            monthlyComparison: {
              current: { reviews: 0, rating: 0, questions: 0 },
              previous: { reviews: 0, rating: 0, questions: 0 }
            },
            locationHighlights: []
        };
        return NextResponse.json(zeroStats);
    }

    // 💡 جلب جميع المراجعات مع فلترة التاريخ في قاعدة البيانات (بدلاً من JavaScript)
    // ✅ FIX: Use database WHERE clause instead of JavaScript filtering
    const { data: allReviews } = await supabase
        .from("gmb_reviews")
        .select("rating, review_reply, review_date, created_at, location_id")
        .eq("user_id", userId)
        .in("location_id", validLocationIds);

    const reviews = allReviews || [];

    // ✅ FIX: Fetch recent period reviews directly from database
    const { data: recentReviewsData } = await supabase
        .from("gmb_reviews")
        .select("rating, review_reply, review_date, created_at, location_id")
        .eq("user_id", userId)
        .in("location_id", validLocationIds)
        .gte("review_date", startOfPeriod.toISOString())
        .lte("review_date", endOfPeriod.toISOString())
        .order("review_date", { ascending: false });

    const recentReviews = recentReviewsData || [];

    // ✅ FIX: Fetch previous period reviews directly from database
    const { data: previousPeriodReviewsData } = await supabase
        .from("gmb_reviews")
        .select("rating, review_reply, review_date, created_at, location_id")
        .eq("user_id", userId)
        .in("location_id", validLocationIds)
        .gte("review_date", prevStart.toISOString())
        .lte("review_date", prevEnd.toISOString())
        .order("review_date", { ascending: false });

    const previousPeriodReviews = previousPeriodReviewsData || [];

    // 💡 جلب عدد الأسئلة غير المجاب عنها
    const { data: unansweredQuestionsData } = await supabase
        .from("gmb_questions")
        .select("id")
        .eq("user_id", userId)
        .in("location_id", validLocationIds)
        .is("answer_text", null);

    const unansweredQuestions = unansweredQuestionsData?.length || 0;

    // 💡 حساب المراجعات المعلقة (بدون رد)
    const pendingReviewsData = reviews.filter(r => !r.review_reply || r.review_reply.trim() === '');
    const pendingReviews = pendingReviewsData.length;

    // ========================================
    // حساب الإحصائيات الأساسية
    // ========================================

    // 1. إجمالي المراجعات والتقييمات
    const allTimeRatings = reviews.map(r => r.rating).filter(r => r && r > 0);
    const allTimeAverageRating = allTimeRatings.length > 0 
      ? parseFloat((allTimeRatings.reduce((sum, r) => sum + r, 0) / allTimeRatings.length).toFixed(2)) 
      : 0;
    const totalReviews = reviews.length;

    // 3. حساب متوسط التقييم للفترة الأخيرة (30 يوم)
    const recentRatings = recentReviews.map(r => r.rating).filter(r => r && r > 0);
    const recentAverageRating = recentRatings.length > 0
      ? parseFloat((recentRatings.reduce((sum, r) => sum + r, 0) / recentRatings.length).toFixed(2))
      : allTimeAverageRating;

    // 4. حساب متوسط التقييم للفترة السابقة (30-60 يوم قبل)
    const previousRatings = previousPeriodReviews.map(r => r.rating).filter(r => r && r > 0);
    const previousAverageRating = previousRatings.length > 0
      ? parseFloat((previousRatings.reduce((sum, r) => sum + r, 0) / previousRatings.length).toFixed(2))
      : 0;

    // 5. حساب Rating Trend (% تغيير)
    const ratingTrend = previousAverageRating > 0
      ? parseFloat((((recentAverageRating - previousAverageRating) / previousAverageRating) * 100).toFixed(2))
      : 0;

    // 6. حساب Reviews Trend (% تغيير في عدد المراجعات)
    const reviewsTrend = previousPeriodReviews.length > 0
      ? parseFloat((((recentReviews.length - previousPeriodReviews.length) / previousPeriodReviews.length) * 100).toFixed(2))
      : 0;

    // 7. حساب معدل الرد (Response Rate)
    const reviewsWithReplies = reviews.filter(r => r.review_reply && r.review_reply.trim().length > 0);
    const responseRate = totalReviews > 0 
      ? parseFloat((reviewsWithReplies.length / totalReviews * 100).toFixed(2)) 
      : 0;
    const unansweredReviewCount = totalReviews - reviewsWithReplies.length;

    // 8. حساب Locations Trend (% تغيير في عدد المواقع)
    const recentLocations = activeLocationsData?.filter(loc => {
      const createdDate = new Date(loc.created_at);
      return createdDate >= startOfPeriod && createdDate <= endOfPeriod;
    }) || [];

    const locationsTrend = recentLocations.length > 0
      ? parseFloat(((recentLocations.length / totalLocations) * 100).toFixed(2))
      : 0;

    // ========================================
    // حساب GMB Health Score و Bottlenecks
    // ========================================
    const bottlenecks: Bottleneck[] = [];
    let score = 100;

    // 2. تقييم عنق الزجاجة (Bottlenecks)

    // a. تقييم الردود (Reviews)
    if (unansweredReviewCount > 0) {
        score -= Math.min(20, unansweredReviewCount * 2);
        bottlenecks.push({
            type: 'Reviews',
            count: unansweredReviewCount,
            message: `${unansweredReviewCount} review${unansweredReviewCount > 1 ? 's' : ''} awaiting response.`,
            link: '/reviews',
            severity: unansweredReviewCount > 10 ? 'high' : unansweredReviewCount > 5 ? 'medium' : 'low',
        });
    }

    // b. تقييم الأسئلة (Q&A) - استخدام البيانات المحسوبة مسبقاً
    const questionCount = unansweredQuestions;
    
    if (questionCount > 0) {
        score -= Math.min(10, questionCount * 3);
        bottlenecks.push({
            type: 'Response',
            count: questionCount,
            message: `${questionCount} customer question${questionCount > 1 ? 's' : ''} need answering.`,
            link: '/questions',
            severity: questionCount > 5 ? 'high' : 'medium',
        });
    }

    // c. تقييم الجودة (Quality - Rating)
    if (recentAverageRating < 4.0 && totalReviews > 10) {
        score -= 15;
        bottlenecks.push({
            type: 'General',
            count: 1,
            message: `Average rating (${recentAverageRating.toFixed(1)}) is below 4.0. Focus on service quality.`,
            link: '/analytics',
            severity: 'high',
        });
    }

    // d. تقييم معدل الرد (Response Rate)
    if (responseRate < 80 && totalReviews > 5) {
        score -= 10;
        bottlenecks.push({
            type: 'Response',
            count: 1,
            message: `Response rate (${responseRate.toFixed(1)}%) is below target. Aim for 80%+.`,
            link: '/reviews',
            severity: 'medium',
        });
    }

    // e. تقييم الامتثال (Compliance - Sync)
    if (activeAccount && activeAccount.last_sync) {
        const lastSyncTime = new Date(activeAccount.last_sync);
        const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSync > 24) {
             score -= 5;
             bottlenecks.push({
                type: 'Compliance',
                count: 1,
                message: `Data is stale. Last sync was ${Math.round(hoursSinceLastSync)} hours ago.`,
                link: '/settings',
                severity: hoursSinceLastSync > 72 ? 'high' : 'low',
            });
        }
    }

    // 3. تحديد النتيجة النهائية (Health Score)
    const healthScore = Math.max(0, Math.min(100, Math.round(score)));

  // ========================================
  // بيانات المقارنة للفترة الحالية مقابل السابقة
  // ========================================

    const { data: currentMonthQuestions } = await supabase
        .from("gmb_questions")
        .select("id")
        .eq("user_id", userId)
        .in("location_id", validLocationIds)
        .gte("created_at", startOfPeriod.toISOString())
        .lte("created_at", endOfPeriod.toISOString());

    const { data: lastMonthQuestions } = await supabase
        .from("gmb_questions")
        .select("id")
        .eq("user_id", userId)
        .in("location_id", validLocationIds)
        .gte("created_at", prevStart.toISOString())
        .lte("created_at", prevEnd.toISOString());

    // ✅ FIX: Use already fetched filtered reviews (no need to filter again)
    const currentMonthReviews = recentReviews;
    const lastMonthReviews = previousPeriodReviews;

    const currentMonthRatings = currentMonthReviews.map(r => r.rating).filter(r => r && r > 0);
    const lastMonthRatings = lastMonthReviews.map(r => r.rating).filter(r => r && r > 0);

    const monthlyComparison = {
      current: {
        reviews: currentMonthReviews.length,
        rating: currentMonthRatings.length > 0 
          ? parseFloat((currentMonthRatings.reduce((sum, r) => sum + r, 0) / currentMonthRatings.length).toFixed(2))
          : 0,
        questions: currentMonthQuestions?.length || 0
      },
      previous: {
        reviews: lastMonthReviews.length,
        rating: lastMonthRatings.length > 0
          ? parseFloat((lastMonthRatings.reduce((sum, r) => sum + r, 0) / lastMonthRatings.length).toFixed(2))
          : 0,
        questions: lastMonthQuestions?.length || 0
      }
    };

    // ========================================
    // حساب أبرز المواقع (Location Highlights)
    // ========================================
    
    const locationHighlights: Array<{
      id: string;
      name: string;
      rating: number;
      reviewCount: number;
      pendingReviews: number;
      ratingChange?: number;
      category: 'top' | 'attention' | 'improved';
    }> = [];

    if (activeLocationsData && activeLocationsData.length > 0) {
      // ✅ FIX: Batch query all reviews once instead of N+1 queries
      // Step 1: All reviews are already fetched above, group by location
      const reviewsByLocation = (allReviews || []).reduce((acc, review) => {
        if (!acc[review.location_id]) acc[review.location_id] = [];
        acc[review.location_id]!.push(review);
        return acc;
      }, {} as Record<string, typeof allReviews>);

      // Step 2: Group recent and previous period reviews by location
      const recentReviewsByLocation = (recentReviews || []).reduce((acc, review) => {
        if (!acc[review.location_id]) acc[review.location_id] = [];
        acc[review.location_id]!.push(review);
        return acc;
      }, {} as Record<string, typeof recentReviews>);

      const previousReviewsByLocation = (previousPeriodReviews || []).reduce((acc, review) => {
        if (!acc[review.location_id]) acc[review.location_id] = [];
        acc[review.location_id]!.push(review);
        return acc;
      }, {} as Record<string, typeof previousPeriodReviews>);

      // Step 3: Process each location with grouped data (no database queries)
      const locationStats = activeLocationsData.map(location => {
        const reviewsData = reviewsByLocation[location.id] || [];
        const recentLocationReviews = recentReviewsByLocation[location.id] || [];
        const previousLocationReviews = previousReviewsByLocation[location.id] || [];

        const ratings = reviewsData.map(r => r.rating).filter(r => r && r > 0);
        const avgRating = ratings.length > 0
          ? parseFloat((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2))
          : 0;

        const pendingReviewsCount = reviewsData.filter(r => !r.review_reply || r.review_reply.trim() === '').length;

        // حساب التغيير في التقييم
        const recentLocationRatings = recentLocationReviews.map(r => r.rating).filter(r => r && r > 0);
        const previousLocationRatings = previousLocationReviews.map(r => r.rating).filter(r => r && r > 0);

        const recentRating = recentLocationRatings.length > 0
          ? recentLocationRatings.reduce((sum, r) => sum + r, 0) / recentLocationRatings.length
          : 0;

        const previousRating = previousLocationRatings.length > 0
          ? previousLocationRatings.reduce((sum, r) => sum + r, 0) / previousLocationRatings.length
          : 0;

        const ratingChange = previousRating > 0
          ? parseFloat((((recentRating - previousRating) / previousRating) * 100).toFixed(2))
          : 0;

        return {
          id: location.id,
          name: location.location_name || 'Unknown Location',
          rating: avgRating,
          reviewCount: reviewsData.length,
          pendingReviews: pendingReviewsCount,
          ratingChange
        };
      });

      // 1. Top Performer (أعلى تقييم)
      const topLocation = [...locationStats].sort((a, b) => b.rating - a.rating)[0];
      if (topLocation && topLocation.rating > 0) {
        locationHighlights.push({ ...topLocation, category: 'top' });
      }

      // 2. Needs Attention (أكثر مراجعات معلقة أو أقل تقييم)
      const attentionLocation = [...locationStats]
        .filter(l => l.pendingReviews > 0 || l.rating < 4.0)
        .sort((a, b) => {
          if (a.pendingReviews !== b.pendingReviews) return b.pendingReviews - a.pendingReviews;
          return a.rating - b.rating;
        })[0];
      
      if (attentionLocation && attentionLocation.id !== topLocation?.id) {
        locationHighlights.push({ ...attentionLocation, category: 'attention' });
      }

      // 3. Most Improved (أكبر تحسن)
      const improvedLocation = [...locationStats]
        .filter(l => l.ratingChange && l.ratingChange > 0)
        .sort((a, b) => (b.ratingChange || 0) - (a.ratingChange || 0))[0];
      
      if (improvedLocation && improvedLocation.id !== topLocation?.id && improvedLocation.id !== attentionLocation?.id) {
        locationHighlights.push({ ...improvedLocation, category: 'improved' });
      }
    }

    // ========================================
    // إرجاع الإحصائيات النهائية
    // ========================================
    const finalStats: ProcessedStats = {
        totalLocations,
        locationsTrend,
        recentAverageRating,
        allTimeAverageRating,
        ratingTrend,
        totalReviews,
        reviewsTrend,
        responseRate,
        pendingReviews,
        unansweredQuestions,
        healthScore,
        monthlyComparison,
        locationHighlights,
        bottlenecks: bottlenecks.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        }),
    };

    return NextResponse.json(finalStats);

  } catch (error) {
    // Log full error internally for debugging
    console.error('API Error fetching dashboard stats:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    // Send generic error to client
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Unable to load dashboard statistics. Please try again later.',
        code: 'DASHBOARD_STATS_ERROR'
      },
      { status: 500 }
    );
  }
}