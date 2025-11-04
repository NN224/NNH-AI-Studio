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
  // حقول الذكاء الاصطناعي الجديدة
  healthScore: number;
  bottlenecks: Bottleneck[];
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
        .select("id, created_at")
        .eq("user_id", userId)
        .in("gmb_account_id", activeAccountIds);

    const activeLocationIds = activeLocationsData?.map(loc => loc.id) || [];
    const totalLocations = activeLocationsData?.length || 0;

    // ... (منطق إرجاع الصفر في حالة عدم وجود مواقع) ...
    if (activeLocationIds.length === 0) {
        const zeroStats: ProcessedStats = {
            totalLocations: 0, locationsTrend: 0, recentAverageRating: 0, allTimeAverageRating: 0, ratingTrend: 0,
            totalReviews: 0, reviewsTrend: 0, responseRate: 0, healthScore: 0, bottlenecks: [],
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

    // b. تقييم الأسئلة (Q&A) - جلب فعلي من قاعدة البيانات
    const { data: unansweredQuestions } = await supabase
        .from("gmb_questions")
        .select("id")
        .eq("user_id", userId)
        .in("location_id", activeLocationIds)
        .is("answer_text", null);
    
    const questionCount = unansweredQuestions?.length || 0;
    
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
        healthScore,
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