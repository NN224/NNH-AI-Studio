import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface HealthScore {
  score: number;
  maxScore: number;
  percentage: number;
  category: string;
  factors: HealthFactor[];
}

interface HealthFactor {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  status: "excellent" | "good" | "needs_improvement" | "critical";
  description: string;
  recommendations?: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locationId = params.locationId;

    // Fetch location data
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("*")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Fetch related data for health calculation
    const [reviewsResult, postsResult, attributesResult] = await Promise.all([
      supabase
        .from("gmb_reviews")
        .select("rating, reply_text, review_date")
        .eq("location_id", locationId)
        .eq("user_id", user.id),

      supabase
        .from("gmb_posts")
        .select("post_type, event_state, created_at")
        .eq("location_id", locationId)
        .eq("user_id", user.id)
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ),

      supabase
        .from("gmb_location_attributes")
        .select("*")
        .eq("location_id", locationId)
        .eq("user_id", user.id),
    ]);

    const reviews = reviewsResult.data || [];
    const recentPosts = postsResult.data || [];
    const attributes = attributesResult.data || [];

    // Calculate health factors
    const factors: HealthFactor[] = [];

    // 1. Business Information Completeness
    const requiredFields = [
      "name",
      "address",
      "phone",
      "website",
      "category",
      "business_hours",
    ];
    const completedFields = requiredFields.filter((field) => {
      const value = location[field];
      return value && value !== "" && value !== null;
    }).length;

    const infoScore = (completedFields / requiredFields.length) * 100;
    factors.push({
      name: "Business Information",
      score: Math.round(infoScore),
      maxScore: 100,
      weight: 0.25,
      status:
        infoScore >= 90
          ? "excellent"
          : infoScore >= 70
            ? "good"
            : infoScore >= 50
              ? "needs_improvement"
              : "critical",
      description: `${completedFields}/${requiredFields.length} required fields completed`,
      recommendations:
        infoScore < 100
          ? [
              "Complete missing business information",
              "Verify all contact details",
            ]
          : undefined,
    });

    // 2. Review Management
    const totalReviews = reviews.length;
    const repliedReviews = reviews.filter(
      (r) => r.reply_text && r.reply_text.trim() !== "",
    ).length;
    const responseRate =
      totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0;

    const reviewScore = Math.min(100, responseRate * 0.6 + averageRating * 20);
    factors.push({
      name: "Review Management",
      score: Math.round(reviewScore),
      maxScore: 100,
      weight: 0.3,
      status:
        reviewScore >= 80
          ? "excellent"
          : reviewScore >= 60
            ? "good"
            : reviewScore >= 40
              ? "needs_improvement"
              : "critical",
      description: `${Math.round(responseRate)}% response rate, ${averageRating.toFixed(1)} avg rating`,
      recommendations:
        responseRate < 80
          ? ["Respond to more customer reviews", "Aim for 80%+ response rate"]
          : undefined,
    });

    // 3. Content Activity
    const contentScore = Math.min(100, recentPosts.length * 10);
    factors.push({
      name: "Content Activity",
      score: contentScore,
      maxScore: 100,
      weight: 0.2,
      status:
        contentScore >= 80
          ? "excellent"
          : contentScore >= 50
            ? "good"
            : contentScore >= 30
              ? "needs_improvement"
              : "critical",
      description: `${recentPosts.length} posts in last 30 days`,
      recommendations:
        contentScore < 80
          ? ["Post regular updates and offers", "Share photos and events"]
          : undefined,
    });

    // 4. Attributes & Features
    const attributeScore = Math.min(100, attributes.length * 5);
    factors.push({
      name: "Attributes & Features",
      score: attributeScore,
      maxScore: 100,
      weight: 0.15,
      status:
        attributeScore >= 80
          ? "excellent"
          : attributeScore >= 50
            ? "good"
            : attributeScore >= 30
              ? "needs_improvement"
              : "critical",
      description: `${attributes.length} attributes configured`,
      recommendations:
        attributeScore < 80
          ? ["Add relevant business attributes", "Enable available features"]
          : undefined,
    });

    // 5. Profile Optimization
    const hasPhotos = location.photos && location.photos.length > 0;
    const hasDescription =
      location.description && location.description.trim() !== "";
    const hasLogo = location.logo_url && location.logo_url.trim() !== "";

    const optimizationScore =
      [hasPhotos, hasDescription, hasLogo].filter(Boolean).length * 33.33;
    factors.push({
      name: "Profile Optimization",
      score: Math.round(optimizationScore),
      maxScore: 100,
      weight: 0.1,
      status:
        optimizationScore >= 80
          ? "excellent"
          : optimizationScore >= 50
            ? "good"
            : optimizationScore >= 30
              ? "needs_improvement"
              : "critical",
      description: `Profile completeness and visual appeal`,
      recommendations:
        optimizationScore < 100
          ? [
              "Add high-quality photos",
              "Write compelling description",
              "Upload business logo",
            ]
          : undefined,
    });

    // Calculate overall health score
    const weightedScore = factors.reduce((sum, factor) => {
      return sum + factor.score * factor.weight;
    }, 0);

    const overallHealth: HealthScore = {
      score: Math.round(weightedScore),
      maxScore: 100,
      percentage: Math.round(weightedScore),
      category:
        weightedScore >= 80
          ? "excellent"
          : weightedScore >= 60
            ? "good"
            : weightedScore >= 40
              ? "needs_improvement"
              : "critical",
      factors,
    };

    // Generate summary recommendations
    const allRecommendations = factors
      .filter((f) => f.recommendations)
      .flatMap((f) => f.recommendations!)
      .slice(0, 5); // Top 5 recommendations

    return NextResponse.json({
      health: overallHealth,
      summary: {
        score: overallHealth.score,
        category: overallHealth.category,
        recommendations: allRecommendations,
        lastUpdated: new Date().toISOString(),
      },
      details: {
        location: {
          name: location.name,
          id: location.id,
          category: location.category,
        },
        metrics: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          responseRate: Math.round(responseRate),
          recentPosts: recentPosts.length,
          attributes: attributes.length,
        },
      },
    });
  } catch (error) {
    console.error("Health API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
