// app/api/reviews/sentiment/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { AIReviewService } from "@/lib/services/ai-review-service";
import {
  mlSentimentService,
  MLSentimentService,
} from "@/lib/services/ml-sentiment-service";
import { reviewsLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      reviewsLogger.error(
        "Auth error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Please log in to view sentiment analysis",
        },

        { status: 401 },
      );
    }

    console.log("Fetching reviews for sentiment analysis for user:", user.id);

    const { data: reviews, error } = await supabase

      .from("gmb_reviews")

      .select(
        `

        *,

        gmb_locations!inner (

          id,

          location_name,

          user_id

        )

      `,
      )

      .eq("gmb_locations.user_id", user.id)

      .order("review_date", { ascending: false, nullsFirst: false });

    if (error) {
      reviewsLogger.error(
        "Database error fetching reviews for sentiment",
        error instanceof Error ? error : new Error(String(error)),
        { userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to fetch reviews", details: error.message },

        { status: 500 },
      );
    }

    console.log(`Analyzing sentiment for ${reviews?.length || 0} reviews`);

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({
        sentimentData: {
          positive: 0,

          neutral: 0,

          negative: 0,

          total: 0,
        },

        hotTopics: [],
      });
    }

    // Use ML-based sentiment analysis
    let sentimentData;
    let hotTopics;

    try {
      // Analyze sentiment for each review using ML
      const reviewsForAnalysis = reviews.map((review) => ({
        id: review.id,
        text: review.review_text || review.comment || "",
        rating: review.rating,
      }));

      const mlResults =
        await mlSentimentService.analyzeBatch(reviewsForAnalysis);

      // Convert results to array for stats calculation
      const resultsArray = Array.from(mlResults.values());

      // Calculate aggregate stats
      const stats = MLSentimentService.calculateStats(resultsArray);

      sentimentData = {
        positive: stats.positive,
        neutral: stats.neutral,
        negative: stats.negative,
        mixed: stats.mixed,
        total: reviews.length,
        averageScore: stats.averageScore,
        topPositiveAspects: stats.topPositiveAspects,
        topNegativeAspects: stats.topNegativeAspects,
        emotions: stats.emotionBreakdown,
      };

      // Extract hot topics from ML analysis
      const allTopics = new Map<string, { count: number; sentiment: string }>();
      resultsArray.forEach((result) => {
        result.topics.forEach((topic) => {
          const existing = allTopics.get(topic.topic);
          if (existing) {
            existing.count++;
          } else {
            allTopics.set(topic.topic, {
              count: 1,
              sentiment: topic.sentiment,
            });
          }
        });
      });

      hotTopics = Array.from(allTopics.entries())
        .map(([topic, data]) => ({
          topic,
          count: data.count,
          sentiment: data.sentiment,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Update reviews in database with ML sentiment
      const updatePromises = Array.from(mlResults.entries()).map(
        ([reviewId, result]) =>
          supabase
            .from("gmb_reviews")
            .update({
              ai_sentiment: result.sentiment,
              ai_sentiment_score: result.score,
              ai_sentiment_analysis: result, // Store full analysis
            })
            .eq("id", reviewId),
      );

      await Promise.all(updatePromises);
    } catch (mlError) {
      reviewsLogger.error(
        "ML sentiment analysis failed, using fallback",
        mlError instanceof Error ? mlError : new Error(String(mlError)),
      );

      // Fall back to basic keyword analysis
      sentimentData = AIReviewService.calculateSentimentData(reviews);
      hotTopics = AIReviewService.extractKeywords(reviews);
    }

    return NextResponse.json({
      sentimentData,

      hotTopics,

      total: reviews.length,
    });
  } catch (error) {
    reviewsLogger.error(
      "Unexpected error in sentiment API",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      { error: "Internal server error", details: String(error) },

      { status: 500 },
    );
  }
}
