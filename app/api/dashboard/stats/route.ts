// app/api/dashboard/stats/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = user.id;
    // ... (منطق حساب الفترات الزمنية) ...
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

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
        .select("id, created_at, location_name, average_rating")
        .eq("user_id", userId)
        .in("gmb_account_id", activeAccountIds);

    const activeLocationIds = activeLocationsData?.map(loc => loc.id) || [];
    const totalLocations = activeLocationsData?.length || 0;

    // ... (منطق إرجاع الصفر في حالة عدم وجود مواقع) ...
    if (activeLocationIds.length === 0) {
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

    // 💡 جلب الأسئلة غير المستجاب لها من قاعدة البيانات
    const { data: allReviews } = await supabase
        .from("gmb_reviews")
        .select("rating, review_reply, review_date, created_at")
        .eq("user_id", userId)
        .in("location_id", activeLocationIds);

    const reviews = allReviews || [];

    // 💡 جلب عدد الأسئلة غير المجاب عنها
    const { data: unansweredQuestionsData } = await supabase
        .from("gmb_questions")
        .select("id")
        .eq("user_id", userId)
        .in("location_id", activeLocationIds)
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

    // 2. فلترة المراجعات حسب الفترات الزمنية
    const recentReviews = reviews.filter(r => {
      const reviewDate = new Date(r.review_date || r.created_at);
      return reviewDate >= thirtyDaysAgo;
    });

    const previousPeriodReviews = reviews.filter(r => {
      const reviewDate = new Date(r.review_date || r.created_at);
      return reviewDate >= sixtyDaysAgo && reviewDate < thirtyDaysAgo;
    });

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
      return createdDate >= thirtyDaysAgo;
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
    // حساب بيانات المقارنة الشهرية للمخطط البياني
    // ========================================
    
    // جلب بيانات الأسئلة للشهر الحالي والسابق
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: currentMonthQuestions } = await supabase
        .from("gmb_questions")
        .select("id")
        .eq("user_id", userId)
        .in("location_id", activeLocationIds)
        .gte("created_at", startOfCurrentMonth.toISOString());

    const { data: lastMonthQuestions } = await supabase
        .from("gmb_questions")
        .select("id")
        .eq("user_id", userId)
        .in("location_id", activeLocationIds)
        .gte("created_at", startOfLastMonth.toISOString())
        .lte("created_at", endOfLastMonth.toISOString());

    const currentMonthReviews = reviews.filter(r => {
      const reviewDate = new Date(r.review_date || r.created_at);
      return reviewDate >= startOfCurrentMonth;
    });

    const lastMonthReviews = reviews.filter(r => {
      const reviewDate = new Date(r.review_date || r.created_at);
      return reviewDate >= startOfLastMonth && reviewDate <= endOfLastMonth;
    });

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
      // جلب بيانات المراجعات لكل موقع
      const locationStats = await Promise.all(
        activeLocationsData.map(async (location) => {
          const { data: locationReviews } = await supabase
            .from("gmb_reviews")
            .select("rating, review_reply, review_date, created_at")
            .eq("location_id", location.id)
            .eq("user_id", userId);

          const reviewsData = locationReviews || [];
          const ratings = reviewsData.map(r => r.rating).filter(r => r && r > 0);
          const avgRating = ratings.length > 0
            ? parseFloat((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2))
            : 0;

          const pendingReviewsCount = reviewsData.filter(r => !r.review_reply || r.review_reply.trim() === '').length;

          // حساب التغيير في التقييم
          const recentLocationReviews = reviewsData.filter(r => {
            const reviewDate = new Date(r.review_date || r.created_at);
            return reviewDate >= thirtyDaysAgo;
          });

          const previousLocationReviews = reviewsData.filter(r => {
            const reviewDate = new Date(r.review_date || r.created_at);
            return reviewDate >= sixtyDaysAgo && reviewDate < thirtyDaysAgo;
          });

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
        })
      );

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
    console.error('API Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to process dashboard stats' }, { status: 500 });
  }
}