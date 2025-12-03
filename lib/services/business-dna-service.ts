/**
 * 🧠 BUSINESS DNA SERVICE
 *
 * This service extracts and maintains a comprehensive "DNA profile" of the business.
 * It analyzes reviews, posts, questions, and metrics to build deep understanding.
 *
 * Think of it as: "Making AI know the business like a 10-year employee"
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface BusinessDNA {
  // Identity
  businessName: string;
  businessType: string;
  businessCategory: string;
  targetAudience: string;
  brandVoice: string;
  languages: string[];

  // Intelligence
  strengths: string[];
  weaknesses: string[];
  commonTopics: Array<{
    topic: string;
    mentions: number;
    sentiment: "positive" | "negative" | "neutral";
  }>;
  customerPersonas: Array<{
    type: string;
    percentage: number;
    characteristics: string[];
  }>;

  // Patterns
  peakDays: string[];
  peakHours: string[];
  bestPostTimes: Array<{ day: string; hour: number }>;
  seasonalTrends: Record<string, any>;

  // Competition
  competitors: Array<{
    name: string;
    rating: number;
    strengths: string[];
  }>;
  marketPosition: string;
  uniqueSellingPoints: string[];

  // Communication
  replyStyle: {
    tone: string;
    length: "short" | "medium" | "long";
    emojiUsage: boolean;
    formalityLevel: number; // 1-10
  };
  signaturePhrases: string[];

  // Metrics
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  sentimentScore: number;
  growthTrend: "growing" | "stable" | "declining";

  // Meta
  confidenceScore: number;
  dataCompleteness: number;
  lastAnalysisAt: string;
}

export interface AnalysisResult {
  success: boolean;
  dna?: BusinessDNA;
  error?: string;
}

/**
 * Extract topics and sentiment from review text using AI
 */
async function analyzeReviewContent(reviews: any[]): Promise<{
  topics: Array<{ topic: string; mentions: number; sentiment: string }>;
  strengths: string[];
  weaknesses: string[];
  sentimentScore: number;
}> {
  if (!reviews || reviews.length === 0) {
    return { topics: [], strengths: [], weaknesses: [], sentimentScore: 0 };
  }

  // Group reviews by rating for analysis
  const positiveReviews = reviews.filter((r) => r.rating >= 4);
  const negativeReviews = reviews.filter((r) => r.rating <= 2);
  const neutralReviews = reviews.filter((r) => r.rating === 3);

  // Extract common words/phrases (simple analysis - can be enhanced with AI)
  const extractTopics = (reviewList: any[], sentiment: string) => {
    const text = reviewList
      .map((r) => r.review_text || r.comment || "")
      .join(" ")
      .toLowerCase();

    // Common business-related keywords to look for
    const keywords = [
      "service",
      "food",
      "staff",
      "price",
      "quality",
      "atmosphere",
      "location",
      "parking",
      "wait",
      "clean",
      "friendly",
      "fast",
      "slow",
      "expensive",
      "cheap",
      "delicious",
      "amazing",
      "terrible",
      "recommend",
      "return",
      "music",
      "drinks",
      "menu",
      "portion",
    ];

    const topicCounts: Record<string, number> = {};
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, "gi");
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        topicCounts[keyword] = matches.length;
      }
    });

    return Object.entries(topicCounts)
      .filter(([_, count]) => count >= 2)
      .map(([topic, mentions]) => ({ topic, mentions, sentiment }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
  };

  const positiveTopics = extractTopics(positiveReviews, "positive");
  const negativeTopics = extractTopics(negativeReviews, "negative");

  // Combine topics
  const allTopics = [...positiveTopics, ...negativeTopics];

  // Extract strengths (from positive reviews)
  const strengths = positiveTopics.slice(0, 5).map((t) => t.topic);

  // Extract weaknesses (from negative reviews)
  const weaknesses = negativeTopics.slice(0, 5).map((t) => t.topic);

  // Calculate sentiment score (-100 to +100)
  const totalReviews = reviews.length;
  const positiveWeight = positiveReviews.length / totalReviews;
  const negativeWeight = negativeReviews.length / totalReviews;
  const sentimentScore = Math.round((positiveWeight - negativeWeight) * 100);

  return { topics: allTopics, strengths, weaknesses, sentimentScore };
}

/**
 * Analyze reply patterns to learn communication style
 */
function analyzeReplyStyle(reviews: any[]): BusinessDNA["replyStyle"] {
  const repliedReviews = reviews.filter((r) => r.reply_text || r.response_text);

  if (repliedReviews.length === 0) {
    return {
      tone: "professional",
      length: "medium",
      emojiUsage: false,
      formalityLevel: 7,
    };
  }

  const replies = repliedReviews.map(
    (r) => r.reply_text || r.response_text || "",
  );

  // Analyze length
  const avgLength =
    replies.reduce((sum, r) => sum + r.length, 0) / replies.length;
  const length =
    avgLength < 100 ? "short" : avgLength > 300 ? "long" : "medium";

  // Check for emoji usage
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;
  const emojiCount = replies.filter((r) => emojiRegex.test(r)).length;
  const emojiUsage = emojiCount > repliedReviews.length * 0.3;

  // Analyze formality (simple heuristic)
  const informalWords = ["hey", "hi", "thanks", "awesome", "cool", "great"];
  const formalWords = [
    "dear",
    "sincerely",
    "regards",
    "appreciate",
    "grateful",
  ];

  let formalCount = 0;
  let informalCount = 0;

  replies.forEach((reply) => {
    const lowerReply = reply.toLowerCase();
    informalWords.forEach((word) => {
      if (lowerReply.includes(word)) informalCount++;
    });
    formalWords.forEach((word) => {
      if (lowerReply.includes(word)) formalCount++;
    });
  });

  const formalityLevel = Math.min(
    10,
    Math.max(1, 5 + (formalCount - informalCount)),
  );

  const tone =
    formalityLevel >= 7
      ? "professional"
      : formalityLevel >= 4
        ? "friendly"
        : "casual";

  return { tone, length, emojiUsage, formalityLevel };
}

/**
 * Extract signature phrases from replies
 */
function extractSignaturePhrases(reviews: any[]): string[] {
  const repliedReviews = reviews.filter((r) => r.reply_text || r.response_text);
  if (repliedReviews.length < 3) return [];

  const replies = repliedReviews.map(
    (r) => r.reply_text || r.response_text || "",
  );

  // Common opening/closing patterns
  const phrases: Record<string, number> = {};

  replies.forEach((reply) => {
    // Check first sentence
    const firstSentence = reply.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length < 100) {
      phrases[firstSentence] = (phrases[firstSentence] || 0) + 1;
    }

    // Check last sentence
    const sentences = reply.split(/[.!?]/).filter((s) => s.trim());
    const lastSentence = sentences[sentences.length - 1]?.trim();
    if (lastSentence && lastSentence.length < 100) {
      phrases[lastSentence] = (phrases[lastSentence] || 0) + 1;
    }
  });

  // Return phrases used more than once
  return Object.entries(phrases)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
}

/**
 * Analyze posting patterns
 */
function analyzePostingPatterns(posts: any[]): {
  bestPostTimes: Array<{ day: string; hour: number }>;
  peakDays: string[];
} {
  if (!posts || posts.length < 5) {
    return { bestPostTimes: [], peakDays: [] };
  }

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const dayHourCounts: Record<string, number> = {};

  posts.forEach((post) => {
    const date = new Date(post.created_at || post.create_time);
    const day = dayNames[date.getDay()];
    const hour = date.getHours();

    dayCounts[day] = (dayCounts[day] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    dayHourCounts[`${day}-${hour}`] =
      (dayHourCounts[`${day}-${hour}`] || 0) + 1;
  });

  // Find peak days
  const peakDays = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);

  // Find best posting times
  const bestPostTimes = Object.entries(dayHourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => {
      const [day, hour] = key.split("-");
      return { day, hour: parseInt(hour) };
    });

  return { bestPostTimes, peakDays };
}

/**
 * Main function: Build or update Business DNA
 */
export async function buildBusinessDNA(
  userId: string,
  locationId?: string,
  options?: { forceRefresh?: boolean },
): Promise<AnalysisResult> {
  try {
    const supabase = createAdminClient();

    // Check if we have recent DNA (skip if less than 1 hour old, unless forced)
    if (!options?.forceRefresh) {
      const { data: existingDNA } = await supabase
        .from("business_dna")
        .select("*")
        .eq("user_id", userId)
        .eq("location_id", locationId || null)
        .single();

      if (existingDNA?.last_analysis_at) {
        const lastAnalysis = new Date(existingDNA.last_analysis_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (lastAnalysis > hourAgo) {
          return { success: true, dna: existingDNA as unknown as BusinessDNA };
        }
      }
    }

    // Fetch all business data
    const locationFilter = locationId
      ? { column: "location_id", value: locationId }
      : null;

    // Get location info
    const locationQuery = supabase
      .from("gmb_locations")
      .select("*")
      .eq("user_id", userId);

    if (locationId) {
      locationQuery.eq("id", locationId);
    }

    const { data: locations } = await locationQuery;
    const primaryLocation = locations?.[0];

    // Get reviews
    const reviewsQuery = supabase
      .from("gmb_reviews")
      .select("*")
      .eq("user_id", userId)
      .order("review_date", { ascending: false })
      .limit(500);

    if (locationId) {
      reviewsQuery.eq("location_id", locationId);
    }

    const { data: reviews } = await reviewsQuery;

    // Get posts
    const postsQuery = supabase
      .from("gmb_posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (locationId) {
      postsQuery.eq("location_id", locationId);
    }

    const { data: posts } = await postsQuery;

    // Get questions
    const questionsQuery = supabase
      .from("gmb_questions")
      .select("*")
      .eq("user_id", userId)
      .limit(100);

    if (locationId) {
      questionsQuery.eq("location_id", locationId);
    }

    const { data: questions } = await questionsQuery;

    // Analyze the data
    const reviewAnalysis = await analyzeReviewContent(reviews || []);
    const replyStyle = analyzeReplyStyle(reviews || []);
    const signaturePhrases = extractSignaturePhrases(reviews || []);
    const postingPatterns = analyzePostingPatterns(posts || []);

    // Calculate metrics
    const totalReviews = reviews?.length || 0;
    const repliedReviews =
      reviews?.filter((r) => r.reply_text || r.response_text || r.has_reply)
        ?.length || 0;
    const responseRate =
      totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0;
    const averageRating =
      totalReviews > 0
        ? reviews!.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0;

    // Determine growth trend
    const recentReviews =
      reviews?.filter((r) => {
        const date = new Date(r.review_date);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return date > monthAgo;
      })?.length || 0;

    const olderReviews =
      reviews?.filter((r) => {
        const date = new Date(r.review_date);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        return date <= monthAgo && date > twoMonthsAgo;
      })?.length || 0;

    const growthTrend =
      recentReviews > olderReviews * 1.2
        ? "growing"
        : recentReviews < olderReviews * 0.8
          ? "declining"
          : "stable";

    // Calculate data completeness
    let completeness = 0;
    if (primaryLocation) completeness += 20;
    if (totalReviews >= 10) completeness += 30;
    if (posts && posts.length >= 5) completeness += 20;
    if (responseRate >= 50) completeness += 15;
    if (questions && questions.length > 0) completeness += 15;

    // Build the DNA object
    const businessDNA: Partial<BusinessDNA> = {
      businessName: primaryLocation?.location_name || "Unknown Business",
      businessType: primaryLocation?.primary_category || "Business",
      businessCategory: primaryLocation?.category || "",
      brandVoice: replyStyle.tone,
      languages: ["en", "ar"], // Default, can be detected

      strengths: reviewAnalysis.strengths,
      weaknesses: reviewAnalysis.weaknesses,
      commonTopics: reviewAnalysis.topics,

      peakDays: postingPatterns.peakDays,
      bestPostTimes: postingPatterns.bestPostTimes,

      replyStyle,
      signaturePhrases,

      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      responseRate,
      sentimentScore: reviewAnalysis.sentimentScore,
      growthTrend,

      confidenceScore: Math.min(
        100,
        completeness + (totalReviews >= 50 ? 20 : 0),
      ),
      dataCompleteness: completeness,
      lastAnalysisAt: new Date().toISOString(),
    };

    // Save to database
    const { data: savedDNA, error: saveError } = await supabase
      .from("business_dna")
      .upsert(
        {
          user_id: userId,
          location_id: locationId || null,
          business_name: businessDNA.businessName,
          business_type: businessDNA.businessType,
          business_category: businessDNA.businessCategory,
          brand_voice: businessDNA.brandVoice,
          languages: businessDNA.languages,
          strengths: businessDNA.strengths,
          weaknesses: businessDNA.weaknesses,
          common_topics: businessDNA.commonTopics,
          peak_days: businessDNA.peakDays,
          best_post_times: businessDNA.bestPostTimes,
          reply_style: businessDNA.replyStyle,
          signature_phrases: businessDNA.signaturePhrases,
          average_rating: businessDNA.averageRating,
          total_reviews: businessDNA.totalReviews,
          response_rate: businessDNA.responseRate,
          sentiment_score: businessDNA.sentimentScore,
          growth_trend: businessDNA.growthTrend,
          confidence_score: businessDNA.confidenceScore,
          data_completeness: businessDNA.dataCompleteness,
          last_analysis_at: businessDNA.lastAnalysisAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,location_id",
        },
      )
      .select()
      .single();

    if (saveError) {
      console.error("Error saving Business DNA:", saveError);
      return { success: false, error: saveError.message };
    }

    return { success: true, dna: businessDNA as BusinessDNA };
  } catch (error) {
    console.error("Error building Business DNA:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get existing Business DNA
 */
export async function getBusinessDNA(
  userId: string,
  locationId?: string,
): Promise<BusinessDNA | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_dna")
    .select("*")
    .eq("user_id", userId)
    .eq("location_id", locationId || null)
    .single();

  if (error || !data) return null;

  return data as unknown as BusinessDNA;
}

/**
 * Generate a natural language summary of the business
 */
export function generateBusinessSummary(dna: BusinessDNA): string {
  const parts: string[] = [];

  parts.push(`${dna.businessName} is a ${dna.businessType}`);

  if (dna.averageRating) {
    parts.push(
      `with a ${dna.averageRating.toFixed(1)}/5 rating from ${dna.totalReviews} reviews`,
    );
  }

  if (dna.strengths.length > 0) {
    parts.push(`Known for: ${dna.strengths.slice(0, 3).join(", ")}`);
  }

  if (dna.weaknesses.length > 0) {
    parts.push(`Areas to improve: ${dna.weaknesses.slice(0, 2).join(", ")}`);
  }

  if (dna.growthTrend === "growing") {
    parts.push("Business is showing positive growth");
  }

  return parts.join(". ") + ".";
}
