/**
 * 🧠 AI PROACTIVE SERVICE
 *
 * يحلل البيانات ويولد رسالة ذكية وشخصية للمستخدم
 * بدل الرسائل الـ generic - AI يبادر ويحكي شي مفيد
 *
 * "مش AI عادي... هذا موظف فاهم شغلك من 10 سنين"
 */

import { createAdminClient } from "@/lib/supabase/server";
import { getBusinessDNA, type BusinessDNA } from "./business-dna-service";

// ============================================
// TYPES
// ============================================

export type InsightType =
  | "problem_detected" // مشكلة واضحة (تقييم نازل، شكاوى متكررة)
  | "opportunity" // فرصة (تقييم عالي، وقت مثالي للنشر)
  | "competitor_alert" // المنافس سوى شي
  | "positive_trend" // الأمور تتحسن
  | "quiet_period" // فترة هادئة - وقت للتخطيط
  | "welcome_back" // بعد غياب
  | "milestone" // إنجاز (100 مراجعة، تقييم 4.5+)
  | "all_good"; // كل شي تمام

export interface SuggestedAction {
  label: string;
  action: string;
  icon?: string;
  primary?: boolean;
}

export interface ProactiveInsight {
  type: InsightType;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  detailedAnalysis?: {
    pattern?: string;
    affectedReviews?: number;
    timeframe?: string;
    comparison?: string;
  };
  suggestedActions: SuggestedAction[];
}

export interface ChangesSummary {
  daysSinceLastVisit: number;
  newReviews: {
    total: number;
    positive: number; // 4-5 stars
    neutral: number; // 3 stars
    negative: number; // 1-2 stars
    avgRating: number;
  };
  ratingChange: number; // +0.2, -0.1, etc.
  pendingReplies: number;
  newQuestions: number;
  autoRepliedCount: number; // ردود الطيار الآلي
}

export interface DetectedPattern {
  type:
    | "complaint_cluster"
    | "day_pattern"
    | "topic_trend"
    | "rating_drop"
    | "rating_rise";
  description: string;
  severity: "high" | "medium" | "low";
  data: any;
}

export interface ProactiveGreeting {
  greeting: string;
  insight: ProactiveInsight;
  context: {
    changes: ChangesSummary;
    patterns: DetectedPattern[];
    dna: BusinessDNA | null;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get time-based greeting in Arabic
 */
function getTimeGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "صباح الخير", emoji: "☀️" };
  if (hour < 18) return { text: "مساء الخير", emoji: "🌤️" };
  return { text: "مساء النور", emoji: "🌙" };
}

/**
 * Get user's first name from profile
 */
async function getUserFirstName(userId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  if (data?.full_name) {
    return data.full_name.split(" ")[0];
  }
  return "there";
}

/**
 * Get last visit timestamp
 */
async function getLastVisit(userId: string): Promise<Date | null> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("user_activity_log")
      .select("created_at")
      .eq("user_id", userId)
      .eq("activity_type", "command_center_visit")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return data ? new Date(data.created_at) : null;
  } catch (error) {
    // Table might not exist, return null
    return null;
  }
}

/**
 * Log current visit
 */
export async function logVisit(userId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("user_activity_log").insert({
      user_id: userId,
      activity_type: "command_center_visit",
      activity_data: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    // Silently fail - logging shouldn't break the main flow
    console.error("Failed to log visit:", error);
  }
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze what changed since last visit
 */
export async function analyzeChangesSinceLastVisit(
  userId: string,
  locationId?: string,
): Promise<ChangesSummary> {
  const supabase = createAdminClient();
  const lastVisit = await getLastVisit(userId);
  const since = lastVisit || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24h ago

  // Calculate days since last visit
  const daysSinceLastVisit = Math.floor(
    (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000),
  );

  // Get new reviews since last visit
  let reviewsQuery = supabase
    .from("gmb_reviews")
    .select("rating, has_reply, review_date")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  if (locationId) {
    reviewsQuery = reviewsQuery.eq("location_id", locationId);
  }

  const { data: newReviews } = await reviewsQuery;

  // Calculate review stats
  const reviews = newReviews || [];
  const positive = reviews.filter((r) => r.rating >= 4).length;
  const neutral = reviews.filter((r) => r.rating === 3).length;
  const negative = reviews.filter((r) => r.rating <= 2).length;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const pendingReplies = reviews.filter((r) => !r.has_reply).length;

  // Get rating change (compare current vs last month)
  let currentRatingQuery = supabase
    .from("gmb_reviews")
    .select("rating")
    .eq("user_id", userId)
    .gte(
      "review_date",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  let previousRatingQuery = supabase
    .from("gmb_reviews")
    .select("rating")
    .eq("user_id", userId)
    .gte(
      "review_date",
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .lt(
      "review_date",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  if (locationId) {
    currentRatingQuery = currentRatingQuery.eq("location_id", locationId);
    previousRatingQuery = previousRatingQuery.eq("location_id", locationId);
  }

  const [{ data: currentReviews }, { data: previousReviews }] =
    await Promise.all([currentRatingQuery, previousRatingQuery]);

  const currentAvg =
    currentReviews && currentReviews.length > 0
      ? currentReviews.reduce((sum, r) => sum + r.rating, 0) /
        currentReviews.length
      : 0;
  const previousAvg =
    previousReviews && previousReviews.length > 0
      ? previousReviews.reduce((sum, r) => sum + r.rating, 0) /
        previousReviews.length
      : currentAvg;

  const ratingChange = Math.round((currentAvg - previousAvg) * 10) / 10;

  // Get new questions
  let questionsQuery = supabase
    .from("gmb_questions")
    .select("id")
    .eq("user_id", userId)
    .eq("answer_status", "pending");

  if (locationId) {
    questionsQuery = questionsQuery.eq("location_id", locationId);
  }

  const { count: newQuestions } = await questionsQuery;

  // Get auto-replied count (from pending_ai_actions)
  const { count: autoRepliedCount } = await supabase
    .from("pending_ai_actions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "auto_published")
    .gte("published_at", since.toISOString());

  return {
    daysSinceLastVisit,
    newReviews: {
      total: reviews.length,
      positive,
      neutral,
      negative,
      avgRating: Math.round(avgRating * 10) / 10,
    },
    ratingChange,
    pendingReplies,
    newQuestions: newQuestions || 0,
    autoRepliedCount: autoRepliedCount || 0,
  };
}

/**
 * Detect patterns in reviews (complaints, time patterns, etc.)
 */
export async function detectPatterns(
  userId: string,
  locationId?: string,
): Promise<DetectedPattern[]> {
  const supabase = createAdminClient();
  const patterns: DetectedPattern[] = [];

  // Get recent negative reviews
  let negativeQuery = supabase
    .from("gmb_reviews")
    .select("review_text, rating, review_date")
    .eq("user_id", userId)
    .lte("rating", 2)
    .gte(
      "review_date",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .order("review_date", { ascending: false })
    .limit(20);

  if (locationId) {
    negativeQuery = negativeQuery.eq("location_id", locationId);
  }

  const { data: negativeReviews } = await negativeQuery;

  if (negativeReviews && negativeReviews.length >= 3) {
    // Check for common complaints
    const complaints = negativeReviews.map(
      (r) => r.review_text?.toLowerCase() || "",
    );

    const commonIssues = [
      { keyword: "انتظار|wait|slow", label: "وقت الانتظار" },
      { keyword: "بارد|cold", label: "حرارة الطعام" },
      { keyword: "خدمة|service|staff", label: "جودة الخدمة" },
      { keyword: "سعر|price|expensive|غالي", label: "الأسعار" },
      { keyword: "نظافة|clean|dirty", label: "النظافة" },
    ];

    for (const issue of commonIssues) {
      const regex = new RegExp(issue.keyword, "i");
      const matches = complaints.filter((c) => regex.test(c)).length;

      if (matches >= 2) {
        patterns.push({
          type: "complaint_cluster",
          description: `${matches} مراجعات سلبية تشتكي من ${issue.label}`,
          severity: matches >= 4 ? "high" : "medium",
          data: { issue: issue.label, count: matches },
        });
      }
    }

    // Check for day pattern
    const dayNames = [
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const dayCounts: Record<number, number> = {};

    negativeReviews.forEach((r) => {
      const day = new Date(r.review_date).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const maxDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    if (maxDay && parseInt(maxDay[1].toString()) >= 3) {
      patterns.push({
        type: "day_pattern",
        description: `أغلب المراجعات السلبية يوم ${dayNames[parseInt(maxDay[0])]}`,
        severity: "medium",
        data: { day: dayNames[parseInt(maxDay[0])], count: maxDay[1] },
      });
    }
  }

  // Check for rating drop
  const { data: recentRating } = await supabase
    .from("business_dna")
    .select("average_rating, sentiment_score")
    .eq("user_id", userId)
    .single();

  if (recentRating) {
    // Get rating from a week ago (if we had historical data)
    // For now, check if sentiment is negative
    if (recentRating.sentiment_score && recentRating.sentiment_score < -20) {
      patterns.push({
        type: "rating_drop",
        description: "المشاعر السلبية مرتفعة في المراجعات الأخيرة",
        severity: "high",
        data: { sentimentScore: recentRating.sentiment_score },
      });
    }
  }

  return patterns;
}

/**
 * Get competitor alerts
 */
async function getCompetitorAlerts(userId: string): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("competitor_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);

    return data || [];
  } catch (error) {
    // Table might not exist, return empty
    return [];
  }
}

// ============================================
// INSIGHT PRIORITIZATION
// ============================================

/**
 * Prioritize and select the most important insight
 */
function prioritizeInsight(
  changes: ChangesSummary,
  patterns: DetectedPattern[],
  competitorAlerts: any[],
  dna: BusinessDNA | null,
): ProactiveInsight {
  // Priority 1: High severity patterns (problems)
  const highPatterns = patterns.filter((p) => p.severity === "high");
  if (highPatterns.length > 0) {
    const pattern = highPatterns[0];
    return {
      type: "problem_detected",
      priority: "high",
      title: "🔴 لاحظت شي مهم",
      message: pattern.description,
      detailedAnalysis: {
        pattern: pattern.type,
        timeframe: "آخر 30 يوم",
      },
      suggestedActions: [
        { label: "📊 حلل المراجعات", action: "analyze_reviews", primary: true },
        { label: "💬 احكيلي أكثر", action: "chat" },
        { label: "⏭️ بعدين", action: "dismiss" },
      ],
    };
  }

  // Priority 2: Welcome back after long absence
  if (changes.daysSinceLastVisit >= 3) {
    return {
      type: "welcome_back",
      priority: "medium",
      title: `وحشتنا! 😊`,
      message: `من آخر زيارة (${changes.daysSinceLastVisit} أيام):
• ${changes.newReviews.total} مراجعة جديدة ${changes.autoRepliedCount > 0 ? `(رديت على ${changes.autoRepliedCount} منها بالطيار الآلي)` : ""}
• ${changes.pendingReplies} مراجعة تحتاج ردك
${changes.newQuestions > 0 ? `• ${changes.newQuestions} سؤال جديد` : ""}

${dna?.averageRating ? `تقييمك: ${dna.averageRating}/5 ⭐` : ""}`,
      suggestedActions: [
        { label: "⚡ ملخص سريع", action: "summary", primary: true },
        { label: "✅ وافق على الكل", action: "approve_all" },
        { label: "📋 التفاصيل", action: "details" },
      ],
    };
  }

  // Priority 3: Negative reviews need attention
  if (changes.newReviews.negative >= 2) {
    return {
      type: "problem_detected",
      priority: "high",
      title: "⚠️ مراجعات سلبية جديدة",
      message: `جاتك ${changes.newReviews.negative} مراجعات سلبية.
${patterns.length > 0 ? `لاحظت إن: ${patterns[0].description}` : "خلني أحللها لك."}`,
      detailedAnalysis: {
        affectedReviews: changes.newReviews.negative,
        timeframe: "منذ آخر زيارة",
      },
      suggestedActions: [
        { label: "🔍 وريني المراجعات", action: "show_negative", primary: true },
        { label: "📝 اقترح حلول", action: "suggest_solutions" },
        { label: "🤷 مش الآن", action: "dismiss" },
      ],
    };
  }

  // Priority 4: Competitor alert
  if (competitorAlerts.length > 0) {
    const alert = competitorAlerts[0];
    return {
      type: "competitor_alert",
      priority: "medium",
      title: "📢 رادار المنافسين",
      message: `"${alert.competitor_name}" ${alert.alert_title}`,
      suggestedActions: [
        { label: "🎯 سوّلي عرض أحسن", action: "create_offer", primary: true },
        { label: "📊 حلل عرضهم", action: "analyze_competitor" },
        { label: "🙅 مش مهتم", action: "dismiss" },
      ],
    };
  }

  // Priority 5: Positive trend / opportunity
  if (
    changes.ratingChange > 0 ||
    (changes.newReviews.positive >= 3 && changes.newReviews.negative === 0)
  ) {
    return {
      type: "positive_trend",
      priority: "low",
      title: "🌟 أخبار حلوة!",
      message:
        changes.ratingChange > 0
          ? `تقييمك طلع ${changes.ratingChange > 0 ? "+" : ""}${changes.ratingChange} هالفترة! العملاء سعيدين.`
          : `${changes.newReviews.positive} مراجعات إيجابية جديدة! 🎉`,
      suggestedActions: [
        { label: "✨ سوّلي عرض", action: "create_offer", primary: true },
        { label: "📊 التفاصيل", action: "details" },
        { label: "👍 حلو، بس", action: "dismiss" },
      ],
    };
  }

  // Priority 6: Quiet period
  if (changes.newReviews.total <= 2) {
    return {
      type: "quiet_period",
      priority: "low",
      title: "فترة هادئة 📊",
      message: `الأسبوع كان هادي - ${changes.newReviews.total || "ولا"} مراجعة جديدة.

بما إنه الوضع مستقر، شو رأيك نشتغل على شي استراتيجي؟`,
      suggestedActions: [
        {
          label: "📈 حلل الأداء",
          action: "analyze_performance",
          primary: true,
        },
        { label: "📝 حملة مراجعات", action: "review_campaign" },
        { label: "📅 خطط للشهر", action: "plan_month" },
      ],
    };
  }

  // Default: All good
  return {
    type: "all_good",
    priority: "low",
    title: "كل شي تمام! ✨",
    message: dna
      ? `تقييمك ${dna.averageRating}/5 ومعدل الرد ${dna.responseRate}%. استمر! 💪`
      : "شغلك ماشي تمام. في شي تبي تسأل عنه؟",
    suggestedActions: [
      { label: "📊 شوف التحليلات", action: "analytics" },
      { label: "💬 اسألني شي", action: "chat", primary: true },
    ],
  };
}

// ============================================
// MAIN EXPORTED FUNCTION
// ============================================

/**
 * Generate proactive greeting with smart insights
 */
export async function generateProactiveGreeting(
  userId: string,
  locationId?: string,
): Promise<ProactiveGreeting> {
  try {
    // Get user's name
    const firstName = await getUserFirstName(userId);

    // Get business DNA
    const dna = await getBusinessDNA(userId, locationId);

    // Analyze changes since last visit
    const changes = await analyzeChangesSinceLastVisit(userId, locationId);

    // Detect patterns
    const patterns = await detectPatterns(userId, locationId);

    // Get competitor alerts
    const competitorAlerts = await getCompetitorAlerts(userId);

    // Prioritize and select insight
    const insight = prioritizeInsight(changes, patterns, competitorAlerts, dna);

    // Build greeting
    const timeGreeting = getTimeGreeting();
    const greeting = `${timeGreeting.emoji} ${timeGreeting.text}، ${firstName}!`;

    // Log this visit (don't await - fire and forget)
    logVisit(userId).catch(() => {});

    return {
      greeting,
      insight,
      context: {
        changes,
        patterns,
        dna,
      },
    };
  } catch (error) {
    console.error("Error generating proactive greeting:", error);

    // Return a simple fallback greeting
    const timeGreeting = getTimeGreeting();
    return {
      greeting: `${timeGreeting.emoji} ${timeGreeting.text}!`,
      insight: {
        type: "all_good",
        priority: "low",
        title: "مرحباً! 👋",
        message: "كيف أقدر أساعدك اليوم؟",
        suggestedActions: [
          { label: "📊 شوف التحليلات", action: "analytics" },
          { label: "💬 اسألني شي", action: "chat", primary: true },
        ],
      },
      context: {
        changes: {
          daysSinceLastVisit: 0,
          newReviews: {
            total: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
            avgRating: 0,
          },
          ratingChange: 0,
          pendingReplies: 0,
          newQuestions: 0,
          autoRepliedCount: 0,
        },
        patterns: [],
        dna: null,
      },
    };
  }
}

/**
 * Save insight when user dismisses or takes action
 */
export async function saveInsightAction(
  userId: string,
  insightType: InsightType,
  action: string,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("ai_proactive_insights").insert({
    user_id: userId,
    insight_type: insightType,
    title: "",
    message: "",
    is_read: true,
    action_taken: action,
    read_at: new Date().toISOString(),
  });
}
