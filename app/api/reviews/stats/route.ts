import { createClient } from "@/lib/supabase/server";
import {
  handleApiAuth,
  safeApiHandler,
} from "@/lib/utils/api-response-handler";
import { safeValue } from "@/lib/utils/data-guards";
import { reviewsLogger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export interface ReviewStats {
  total: number;
  pending: number;
  responded: number;
  responseRate: number;
  avgRating: number;
  totalTrend: number;
  responseRateTrend: number;
  ratingTrend: number;
  totalTrendLabel: string;
  ratingTrendLabel: string;
}

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // التحقق من المصادقة
  const authResult = handleApiAuth(user);
  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  // استخدام معالج API الآمن
  return safeApiHandler<ReviewStats>(
    async () => {
      // جلب المراجعات من قاعدة البيانات
      const { data: reviews, error } = await supabase
        .from("gmb_reviews")
        .select(
          `
          id,
          rating,
          has_reply,
          has_response,
          reply_text,
          review_reply,
          review_date,
          gmb_locations!inner (user_id)
          `,
        )
        .eq("gmb_locations.user_id", authResult.user.id);

      if (error) {
        reviewsLogger.error(
          "Database error fetching review stats",
          error instanceof Error ? error : new Error(String(error)),
          { userId: authResult.user.id },
        );
        throw error;
      }

      // معالجة البيانات بشكل آمن
      const allReviews = reviews || [];
      const total = safeValue(allReviews.length, 0);
      const pending = safeValue(
        allReviews.filter(
          (r) =>
            !r.has_reply && !r.has_response && !r.reply_text && !r.review_reply,
        ).length,
        0,
      );
      const responded = safeValue(total - pending, 0);
      const responseRate = safeValue(
        total > 0 ? Math.round((responded / total) * 100 * 10) / 10 : 0,
        0,
      );

      const avgRating = safeValue(
        allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + safeValue(r.rating, 0), 0) /
              allReviews.length
          : 0,
        0,
      );

      // حساب الاتجاهات (مقارنة الأسبوع الأخير بالأسبوع السابق له)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(
        now.getTime() - 14 * 24 * 60 * 60 * 1000,
      );

      const recentReviews = allReviews.filter((r) => {
        const reviewDate = r.review_date ? new Date(r.review_date) : null;
        return reviewDate && reviewDate >= sevenDaysAgo;
      });

      const previousReviews = allReviews.filter((r) => {
        const reviewDate = r.review_date ? new Date(r.review_date) : null;
        return (
          reviewDate &&
          reviewDate >= fourteenDaysAgo &&
          reviewDate < sevenDaysAgo
        );
      });

      // حساب الاتجاهات بشكل آمن
      const totalTrend = safeValue(
        previousReviews.length > 0
          ? Math.round(
              ((recentReviews.length - previousReviews.length) /
                previousReviews.length) *
                100,
            )
          : recentReviews.length > 0
            ? 100
            : 0,
        0,
      );

      const totalTrendLabel = safeValue(
        totalTrend > 0
          ? `+${recentReviews.length} this week`
          : totalTrend < 0
            ? `${recentReviews.length} this week`
            : "No change",
        "No change",
      );

      const recentAvgRating = safeValue(
        recentReviews.length > 0
          ? recentReviews.reduce((sum, r) => sum + safeValue(r.rating, 0), 0) /
              recentReviews.length
          : 0,
        0,
      );

      const previousAvgRating = safeValue(
        previousReviews.length > 0
          ? previousReviews.reduce(
              (sum, r) => sum + safeValue(r.rating, 0),
              0,
            ) / previousReviews.length
          : 0,
        0,
      );

      const ratingTrend = safeValue(
        previousAvgRating > 0
          ? Math.round(
              ((recentAvgRating - previousAvgRating) / previousAvgRating) *
                100 *
                10,
            ) / 10
          : 0,
        0,
      );

      const ratingTrendLabel = safeValue(
        ratingTrend > 0
          ? `+${ratingTrend.toFixed(1)}% this week`
          : ratingTrend < 0
            ? `${ratingTrend.toFixed(1)}% this week`
            : "No change",
        "No change",
      );

      // إرجاع الإحصاءات
      return {
        total,
        pending,
        responded,
        responseRate,
        avgRating,
        totalTrend,
        responseRateTrend: 0, // يمكن حسابها بطريقة مماثلة
        ratingTrend,
        totalTrendLabel,
        ratingTrendLabel,
      };
    },
    // البيانات الافتراضية في حالة فشل المعالج
    {
      total: 0,
      pending: 0,
      responded: 0,
      responseRate: 0,
      avgRating: 0,
      totalTrend: 0,
      responseRateTrend: 0,
      ratingTrend: 0,
      totalTrendLabel: "No data",
      ratingTrendLabel: "No data",
    },
    // سياق واجهة البرمجة
    { apiName: "reviews/stats", userId: user?.id },
  );
}
