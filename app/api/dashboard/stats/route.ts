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

    // ... (منطق جلب المراجعات) ...
    // 💡 يمكن تحسين هذا بجلب فقط بيانات الـ Reviews/Questions التي تحتاج لرد
    const { data: allReviews } = await supabase
        .from("gmb_reviews")
        .select("rating, review_reply, review_date")
        .eq("user_id", userId)
        .in("location_id", activeLocationIds);

    // 💡 افتراض: جلب الأسئلة غير المستجاب لها (يجب أن يكون لديك جدول gmb_questions)
    // const { data: unansweredQuestions } = await supabase
    //     .from("gmb_questions")
    //     .select("id")
    //     .eq("user_id", userId)
    //     .eq("has_answer", false);
    // const questionCount = unansweredQuestions?.length || 0;
    const questionCount = 2; // placeholder

    const reviews = allReviews || [];

    // ... (منطق حساب الإحصائيات القديم) ...

    // ⭐️ منطق حساب GMB Health Score (GHS) و Bottlenecks
    const bottlenecks: Bottleneck[] = [];
    let score = 100;

    // 1. حساب الإحصائيات (نقوم بتضمينها هنا لسهولة القراءة)
    const allTimeRatings = reviews.map(r => r.rating).filter(r => r && r > 0);
    const allTimeAverageRating = allTimeRatings.length > 0 ? parseFloat((allTimeRatings.reduce((sum, r) => sum + r, 0) / allTimeRatings.length).toFixed(2)) : 0;
    const totalReviews = reviews.length;
    const reviewsWithReplies = reviews.filter(r => r.review_reply && r.review_reply.trim().length > 0);
    const responseRate = totalReviews > 0 ? parseFloat((reviewsWithReplies.length / totalReviews * 100).toFixed(2)) : 0;
    const unansweredReviewCount = totalReviews - reviewsWithReplies.length;

    // 2. تقييم عنق الزجاجة (Bottlenecks)

    // a. تقييم الردود (Response/Reviews)
    if (unansweredReviewCount > 0) {
        score -= Math.min(20, unansweredReviewCount * 2);
        bottlenecks.push({
            type: 'Reviews',
            count: unansweredReviewCount,
            message: `${unansweredReviewCount} new reviews are awaiting response.`,
            link: '/dashboard/reviews',
            severity: unansweredReviewCount > 10 ? 'high' : 'medium',
        });
    }

    // b. تقييم الأسئلة (Q&A)
    if (questionCount > 0) {
        score -= Math.min(10, questionCount * 3);
        bottlenecks.push({
            type: 'Response',
            count: questionCount,
            message: `${questionCount} customer questions need answering.`,
            link: '/dashboard/questions',
            severity: 'medium',
        });
    }

    // c. تقييم الجودة (Quality - Rating)
    if (allTimeAverageRating < 4.0 && totalReviews > 10) {
        score -= 15;
        bottlenecks.push({
            type: 'General',
            count: 1,
            message: `Average rating is below 4.0. Focus on service quality.`,
            link: '/dashboard/analytics',
            severity: 'high',
        });
    }

    // d. تقييم الامتثال (Compliance - Sync)
    if (activeAccount && activeAccount.last_sync) {
        const lastSyncTime = new Date(activeAccount.last_sync);
        const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSync > 24) {
             score -= 5;
             bottlenecks.push({
                type: 'Compliance',
                count: 1,
                message: `Data is stale. Last sync was ${Math.round(hoursSinceLastSync)} hours ago.`,
                link: '/dashboard/settings',
                severity: 'low',
            });
        }
    }


    // 3. تحديد النتيجة النهائية (Health Score)
    const healthScore = Math.max(0, Math.min(100, Math.round(score))); // حفظ النتيجة بين 0 و 100

    // ... (منطق حساب الإحصائيات المتبقية) ...
    // هنا يجب أن تعيد حساب الإحصائيات المتبقية (reviewsTrend, ratingTrend, إلخ)

    const finalStats: ProcessedStats = {
        totalLocations, locationsTrend: 0, recentAverageRating: 0, allTimeAverageRating, ratingTrend: 0,
        totalReviews, reviewsTrend: 0, responseRate, 
        healthScore,
        bottlenecks: bottlenecks.sort((a, b) => (b.severity === 'high' ? 1 : b.severity === 'medium' ? 0 : -1)),
    };

    return NextResponse.json(finalStats);

  } catch (error) {
    console.error('API Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to process dashboard stats' }, { status: 500 });
  }
}